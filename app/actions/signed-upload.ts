"use server";

import { randomUUID } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const STORAGE_BUCKET = "catalog-images";

export type SignedUploadResult =
  | { ok: true; id: string; path: string; token: string }
  | { ok: false; error: string };

/**
 * Issues a short-lived signed upload URL so the browser can send the image
 * straight to Supabase Storage, bypassing Vercel's 4.5 MB Server Action body
 * limit. The browser uploads the bytes; only tiny metadata payloads travel
 * through Server Actions afterwards.
 *
 * - New catalog: omit `catalogId`. We mint a fresh id and use it as the
 *   storage folder (`{id}/original.{ext}`), returning it so the follow-up
 *   insert reuses the same id.
 * - Image replacement: pass the existing `catalogId`. The object lands under
 *   the same folder with a random filename so the public URL changes and CDN
 *   caches don't serve the old image.
 */
export async function createSignedUpload(input: {
  contentType: string;
  catalogId?: string;
}): Promise<SignedUploadResult> {
  const { contentType, catalogId } = input;
  if (!ACCEPTED_TYPES.has(contentType)) {
    return { ok: false, error: "jpg, png, webp 형식만 업로드할 수 있어요" };
  }

  const ext = EXT_BY_TYPE[contentType] ?? "jpg";
  const id = catalogId ?? randomUUID();
  const filename = catalogId ? `${randomUUID()}.${ext}` : `original.${ext}`;
  const objectPath = `${id}/${filename}`;

  const admin = getAdminClient();
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(objectPath);

  if (error || !data) {
    return {
      ok: false,
      error: `업로드 준비에 실패했어요: ${error?.message ?? "알 수 없는 오류"}`,
    };
  }

  return { ok: true, id, path: data.path, token: data.token };
}
