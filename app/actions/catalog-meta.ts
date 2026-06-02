"use server";

import {
  getCatalog,
  getCatalogDownloadIndex,
  type Catalog,
} from "@/lib/data/catalogs";
import {
  listEditLogsForCatalog,
  type EditLog,
} from "@/lib/data/edit-logs";

/**
 * Fetches the edit-log history for a catalog. Called from the detail modal
 * only when the user expands the "로그" accordion — so the modal opens
 * without paying for this query.
 */
export async function fetchEditLogsAction(
  catalogId: string,
): Promise<EditLog[]> {
  return listEditLogsForCatalog(catalogId);
}

/**
 * Computes the download-filename index for a catalog. Called when the user
 * actually clicks the download button. The underlying read is cached.
 */
export async function fetchDownloadIndexAction(
  catalogId: string,
): Promise<number> {
  const catalog = await getCatalog(catalogId);
  if (!catalog) return 1;
  return getCatalogDownloadIndex(
    catalog as Pick<
      Catalog,
      "id" | "customer_name" | "proposal_type_id" | "created_at"
    >,
  );
}
