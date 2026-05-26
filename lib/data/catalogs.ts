import "server-only";
import type { Database } from "@/types/database.types";
import { readJson, writeJson } from "./_io";
import { listProposalTypes, listSiteTypes } from "./types";

export type Catalog = Database["public"]["Tables"]["catalogs"]["Row"];
export type CatalogInsert = Database["public"]["Tables"]["catalogs"]["Insert"];
export type CatalogUpdate = Database["public"]["Tables"]["catalogs"]["Update"];

export type CatalogWithLabels = Catalog & {
  proposal_type: { id: string; slug: string; name: string } | null;
  site_type: { id: string; slug: string; name: string } | null;
};

export interface ListCatalogsParams {
  q?: string;
  proposalTypeIds?: string[];
  siteTypeIds?: string[];
  sort?: "newest" | "oldest" | "customer" | "name";
  includeDeleted?: boolean;
}

async function readAll(): Promise<Catalog[]> {
  return readJson<Catalog[]>("catalogs.json");
}

export async function listCatalogs(
  params: ListCatalogsParams = {},
): Promise<CatalogWithLabels[]> {
  const [rows, proposalTypes, siteTypes] = await Promise.all([
    readAll(),
    listProposalTypes(),
    listSiteTypes(),
  ]);

  const proposalById = new Map(proposalTypes.map((t) => [t.id, t]));
  const siteById = new Map(siteTypes.map((t) => [t.id, t]));

  const q = params.q?.trim().toLowerCase() ?? "";
  const proposalSet = new Set(params.proposalTypeIds ?? []);
  const siteSet = new Set(params.siteTypeIds ?? []);

  let filtered = rows.filter((row) => {
    if (!params.includeDeleted && row.deleted_at) return false;
    if (params.includeDeleted && !row.deleted_at) return false;

    if (q) {
      const hay =
        `${row.site_name} ${row.customer_name} ${row.domain ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (proposalSet.size > 0) {
      if (!row.proposal_type_id || !proposalSet.has(row.proposal_type_id))
        return false;
    }
    if (siteSet.size > 0) {
      if (!row.site_type_id || !siteSet.has(row.site_type_id)) return false;
    }
    return true;
  });

  const sort = params.sort ?? "newest";
  filtered = filtered.sort((a, b) => {
    if (sort === "customer") {
      const cmp = a.customer_name.localeCompare(b.customer_name, "ko");
      if (cmp !== 0) return cmp;
      return a.site_name.localeCompare(b.site_name, "ko");
    }
    if (sort === "name") {
      return a.site_name.localeCompare(b.site_name, "ko");
    }
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    return sort === "oldest" ? at - bt : bt - at;
  });

  return filtered.map((row) => ({
    ...row,
    proposal_type: row.proposal_type_id
      ? (proposalById.get(row.proposal_type_id) ?? null)
      : null,
    site_type: row.site_type_id
      ? (siteById.get(row.site_type_id) ?? null)
      : null,
  }));
}

export async function getCatalog(
  id: string,
): Promise<CatalogWithLabels | null> {
  const all = await listCatalogs({ includeDeleted: true });
  return all.find((c) => c.id === id) ?? null;
}

export async function createCatalog(input: CatalogInsert): Promise<Catalog> {
  const rows = await readAll();
  const now = new Date().toISOString();
  const row: Catalog = {
    id: input.id ?? crypto.randomUUID(),
    site_name: input.site_name,
    customer_name: input.customer_name,
    domain: input.domain ?? null,
    proposal_type_id: input.proposal_type_id ?? null,
    site_type_id: input.site_type_id ?? null,
    design_tool: input.design_tool ?? null,
    figma_url: input.figma_url ?? null,
    local_path: input.local_path ?? null,
    memo: input.memo ?? null,
    image_url: input.image_url ?? null,
    thumbnail_url: input.thumbnail_url ?? null,
    created_by: input.created_by ?? null,
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now,
    deleted_at: input.deleted_at ?? null,
  };
  rows.unshift(row);
  await writeJson("catalogs.json", rows);
  return row;
}

export async function updateCatalog(
  id: string,
  patch: CatalogUpdate,
): Promise<Catalog | null> {
  const rows = await readAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const next: Catalog = {
    ...rows[idx],
    ...patch,
    id: rows[idx].id,
    updated_at: new Date().toISOString(),
  };
  rows[idx] = next;
  await writeJson("catalogs.json", rows);
  return next;
}

export async function softDeleteCatalog(id: string): Promise<Catalog | null> {
  return updateCatalog(id, { deleted_at: new Date().toISOString() });
}

export async function restoreCatalog(id: string): Promise<Catalog | null> {
  return updateCatalog(id, { deleted_at: null });
}

export async function hardDeleteCatalog(id: string): Promise<boolean> {
  const rows = await readAll();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  await writeJson("catalogs.json", next);
  return true;
}
