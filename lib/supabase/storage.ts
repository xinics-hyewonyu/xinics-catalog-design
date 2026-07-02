import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const ACCEPTED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

export type ObjectCheck = { ok: true } | { ok: false; error: string };

/**
 * Validates that a browser-uploaded storage object is well-formed and really
 * exists before we persist a DB row (or public URL) pointing at it.
 *
 * `objectPath` comes from the client, so we never trust it blindly: it must
 * live directly under the catalog's `{folder}/` prefix (no nested paths, no
 * escaping into another catalog's folder) and carry an accepted image
 * extension. We then confirm the object is actually present in Storage.
 */
export async function assertUploadedObject(
  admin: SupabaseClient<Database>,
  bucket: string,
  folder: string,
  objectPath: string,
): Promise<ObjectCheck> {
  const prefix = `${folder}/`;
  if (!objectPath.startsWith(prefix)) {
    return { ok: false, error: "잘못된 이미지 경로예요" };
  }
  const filename = objectPath.slice(prefix.length);
  if (!filename || filename.includes("/")) {
    return { ok: false, error: "잘못된 이미지 경로예요" };
  }
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext || !ACCEPTED_EXT.has(ext)) {
    return { ok: false, error: "jpg, png, webp 형식만 업로드할 수 있어요" };
  }

  const { data, error } = await admin.storage
    .from(bucket)
    .list(folder, { search: filename });
  if (error) {
    return { ok: false, error: `이미지 확인에 실패했어요: ${error.message}` };
  }
  if (!data?.some((f) => f.name === filename)) {
    return { ok: false, error: "업로드된 이미지를 찾을 수 없어요" };
  }
  return { ok: true };
}
