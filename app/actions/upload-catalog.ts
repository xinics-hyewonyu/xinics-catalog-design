"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { createCatalog } from "@/lib/data/catalogs";
import { writeEditLog } from "@/lib/data/edit-logs";
import type { Json } from "@/types/database.types";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
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
  author_name: z.string().optional().or(z.literal("")),
  // YYYY-MM-DD in Asia/Seoul. Optional — if omitted, the DB default (now())
  // is used. When provided, stored as KST-midnight timestamptz.
  created_at_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다")
    .optional()
    .or(z.literal("")),
});

export type UploadResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function nullish(value: FormDataEntryValue | string | null): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

export async function uploadCatalog(formData: FormData): Promise<UploadResult> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "이미지를 선택해주세요" };
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { ok: false, error: "jpg, png, webp 형식만 업로드할 수 있어요" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "파일은 10MB 이하여야 해요" };
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
    author_name: formData.get("author_name") ?? "",
    created_at_date: formData.get("created_at_date") ?? "",
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

  const id = randomUUID();
  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const objectPath = `${id}/original.${ext}`;
  const admin = getAdminClient();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const upload = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });
  if (upload.error) {
    return {
      ok: false,
      error: `이미지 업로드에 실패했어요: ${upload.error.message}`,
    };
  }

  const { data: urlData } = admin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(objectPath);
  const publicUrl = urlData.publicUrl;

  // KST midnight when the user picked a date; otherwise let the DB default
  // (now()) win by omitting created_at from the insert.
  const createdAtIso = parsed.data.created_at_date
    ? `${parsed.data.created_at_date}T00:00:00+09:00`
    : undefined;

  const insertPayload = {
    id,
    site_name: parsed.data.site_name,
    customer_name: parsed.data.customer_name,
    proposal_type_id: parsed.data.proposal_type_id,
    site_type_id: nullish(parsed.data.site_type_id ?? null),
    design_tool: nullish(parsed.data.design_tool ?? null),
    file_path: nullish(parsed.data.file_path ?? null),
    catalog_url: nullish(parsed.data.catalog_url ?? null),
    memo: nullish(parsed.data.memo ?? null),
    author_name: nullish(parsed.data.author_name ?? null),
    image_url: publicUrl,
    thumbnail_url: publicUrl,
    ...(createdAtIso ? { created_at: createdAtIso } : {}),
  };

  try {
    await createCatalog(insertPayload);
  } catch (err) {
    await admin.storage
      .from(STORAGE_BUCKET)
      .remove([objectPath])
      .catch(() => {});
    return {
      ok: false,
      error: `디자인 저장에 실패했어요: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  // Best-effort edit log; the row already saved, so a log failure shouldn't roll back.
  try {
    await writeEditLog({
      catalog_id: id,
      action: "created",
      changes: { snapshot: insertPayload as unknown as Json },
    });
  } catch (err) {
    console.error("[uploadCatalog] edit log write failed:", err);
  }

  updateTag("catalogs");
  revalidatePath("/");
  return { ok: true, id };
}
