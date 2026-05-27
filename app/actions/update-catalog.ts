"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  getCatalog,
  updateCatalog,
  type Catalog,
} from "@/lib/data/catalogs";
import { writeEditLog } from "@/lib/data/edit-logs";
import type { Json } from "@/types/database.types";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const STORAGE_BUCKET = "catalog-images";

const schema = z.object({
  site_name: z.string().min(1, "사이트명을 입력해주세요"),
  customer_name: z.string().min(1, "고객명을 입력해주세요"),
  proposal_type_id: z.string().min(1, "시안 종류를 선택해주세요"),
  site_type_id: z.string().optional().or(z.literal("")),
  design_tool: z.string().optional().or(z.literal("")),
  file_path: z.string().optional().or(z.literal("")),
  catalog_url: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      "http(s):// 로 시작하는 주소여야 합니다",
    ),
  memo: z.string().optional().or(z.literal("")),
});

export type UpdateResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function nullish(value: FormDataEntryValue | string | null): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

const TRACKED_FIELDS = [
  "site_name",
  "customer_name",
  "proposal_type_id",
  "site_type_id",
  "design_tool",
  "file_path",
  "catalog_url",
  "memo",
  "image_url",
] as const;
type Tracked = (typeof TRACKED_FIELDS)[number];

export async function updateCatalogAction(
  formData: FormData,
): Promise<UpdateResult> {
  const catalogId = formData.get("catalog_id");
  if (typeof catalogId !== "string" || !catalogId) {
    return { ok: false, error: "잘못된 요청이에요" };
  }

  const current = await getCatalog(catalogId);
  if (!current) {
    return { ok: false, error: "이미 삭제된 카탈로그예요" };
  }

  const parsed = schema.safeParse({
    site_name: formData.get("site_name") ?? "",
    customer_name: formData.get("customer_name") ?? "",
    proposal_type_id: formData.get("proposal_type_id") ?? "",
    site_type_id: formData.get("site_type_id") ?? "",
    design_tool: formData.get("design_tool") ?? "",
    file_path: formData.get("file_path") ?? "",
    catalog_url: formData.get("catalog_url") ?? "",
    memo: formData.get("memo") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "입력값을 확인해주세요",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const admin = getAdminClient();
  let nextImageUrl = current.image_url;
  let oldObjectPath: string | null = null;
  let newObjectPath: string | null = null;

  // Optional image replacement
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return { ok: false, error: "jpg, png, webp 형식만 업로드할 수 있어요" };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "파일은 10MB 이하여야 해요" };
    }
    const ext = EXT_BY_TYPE[file.type] ?? "jpg";
    newObjectPath = `${catalogId}/${randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const upload = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(newObjectPath, bytes, { contentType: file.type, upsert: false });
    if (upload.error) {
      return {
        ok: false,
        error: `이미지 업로드에 실패했어요: ${upload.error.message}`,
      };
    }
    const { data: urlData } = admin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(newObjectPath);
    nextImageUrl = urlData.publicUrl;

    // Capture old object path for cleanup after the row update succeeds.
    if (current.image_url) {
      const match = current.image_url.match(
        /\/catalog-images\/(.+)$/,
      );
      if (match) oldObjectPath = match[1];
    }
  }

  const nextPatch = {
    site_name: parsed.data.site_name,
    customer_name: parsed.data.customer_name,
    proposal_type_id: parsed.data.proposal_type_id,
    site_type_id: nullish(parsed.data.site_type_id ?? null),
    design_tool: nullish(parsed.data.design_tool ?? null),
    file_path: nullish(parsed.data.file_path ?? null),
    catalog_url: nullish(parsed.data.catalog_url ?? null),
    memo: nullish(parsed.data.memo ?? null),
    image_url: nextImageUrl,
    thumbnail_url: nextImageUrl,
  };

  // Compute diff against tracked fields.
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  for (const field of TRACKED_FIELDS) {
    const before = current[field as Tracked] ?? null;
    const after =
      (nextPatch[field as keyof typeof nextPatch] as unknown) ?? null;
    const norm = (v: unknown) => (v === "" ? null : v);
    if (norm(before) !== norm(after)) {
      diff[field] = { before: norm(before), after: norm(after) };
    }
  }

  if (Object.keys(diff).length === 0) {
    return { ok: true, id: catalogId };
  }

  try {
    await updateCatalog(catalogId, nextPatch as Partial<Catalog>);
  } catch (err) {
    // Roll back any new upload.
    if (newObjectPath) {
      await admin.storage
        .from(STORAGE_BUCKET)
        .remove([newObjectPath])
        .catch(() => {});
    }
    return {
      ok: false,
      error: `수정 저장에 실패했어요: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  // Delete the previous image only after the row update committed.
  if (oldObjectPath && newObjectPath) {
    await admin.storage
      .from(STORAGE_BUCKET)
      .remove([oldObjectPath])
      .catch(() => {});
  }

  try {
    await writeEditLog({
      catalog_id: catalogId,
      action: "updated",
      changes: diff as unknown as Json,
    });
  } catch (err) {
    // Catalog was already updated; surface the log failure as a console warning
    // rather than failing the whole action.
    console.error("[updateCatalog] edit log write failed:", err);
  }

  revalidatePath("/");
  return { ok: true, id: catalogId };
}
