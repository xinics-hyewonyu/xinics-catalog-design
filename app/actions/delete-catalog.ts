"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  getCatalog,
  hardDeleteCatalog,
  restoreCatalog,
  softDeleteCatalog,
} from "@/lib/data/catalogs";
import { writeEditLog } from "@/lib/data/edit-logs";
import type { Json } from "@/types/database.types";

const STORAGE_BUCKET = "catalog-images";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Soft delete: sets deleted_at = now(). Row stays in DB for 30 days.
 */
export async function softDeleteCatalogAction(
  catalogId: string,
): Promise<ActionResult> {
  const current = await getCatalog(catalogId);
  if (!current) return { ok: false, error: "이미 삭제된 카탈로그예요" };
  if (current.deleted_at) {
    return { ok: false, error: "이미 휴지통에 있어요" };
  }

  const row = await softDeleteCatalog(catalogId);
  if (!row) return { ok: false, error: "삭제에 실패했어요" };

  await writeEditLog({
    catalog_id: catalogId,
    action: "deleted",
    changes: {
      customer_name: current.customer_name,
      site_name: current.site_name,
    } as unknown as Json,
  }).catch((err) =>
    console.error("[softDeleteCatalog] log failed:", err),
  );

  revalidatePath("/");
  revalidatePath("/trash");
  return { ok: true, id: catalogId };
}

/**
 * Restore: clears deleted_at.
 */
export async function restoreCatalogAction(
  catalogId: string,
): Promise<ActionResult> {
  const row = await restoreCatalog(catalogId);
  if (!row) return { ok: false, error: "복원에 실패했어요" };

  await writeEditLog({
    catalog_id: catalogId,
    action: "restored",
    changes: {} as unknown as Json,
  }).catch((err) => console.error("[restoreCatalog] log failed:", err));

  revalidatePath("/");
  revalidatePath("/trash");
  return { ok: true, id: catalogId };
}

/**
 * Permanent delete: removes the row + all Storage objects under the catalog id.
 * catalog_edit_logs cascade-delete via FK.
 */
export async function hardDeleteCatalogAction(
  catalogId: string,
): Promise<ActionResult> {
  const current = await getCatalog(catalogId);
  if (!current) return { ok: false, error: "이미 삭제된 카탈로그예요" };

  const admin = getAdminClient();

  // List + remove every storage object stored under the catalog id prefix.
  try {
    const list = await admin.storage.from(STORAGE_BUCKET).list(catalogId);
    if (!list.error && list.data && list.data.length > 0) {
      const paths = list.data.map((f) => `${catalogId}/${f.name}`);
      await admin.storage.from(STORAGE_BUCKET).remove(paths);
    }
  } catch (err) {
    console.error("[hardDeleteCatalog] storage cleanup failed:", err);
  }

  const ok = await hardDeleteCatalog(catalogId);
  if (!ok) return { ok: false, error: "영구 삭제에 실패했어요" };

  revalidatePath("/");
  revalidatePath("/trash");
  return { ok: true, id: catalogId };
}
