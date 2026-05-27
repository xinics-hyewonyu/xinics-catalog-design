import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type Catalog = Database["public"]["Tables"]["catalogs"]["Row"];
export type CatalogInsert = Database["public"]["Tables"]["catalogs"]["Insert"];
export type CatalogUpdate = Database["public"]["Tables"]["catalogs"]["Update"];

type TypeStub = { id: string; slug: string; name: string };

export type CatalogWithLabels = Catalog & {
  proposal_type: TypeStub | null;
  site_type: TypeStub | null;
};

export interface ListCatalogsParams {
  q?: string;
  /** Slugs (e.g. 'first', 'final') — resolved to UUIDs server-side */
  proposalSlugs?: string[];
  siteSlugs?: string[];
  sort?: "newest" | "oldest" | "customer" | "name";
  /**
   * - 'active'  (default) — deleted_at IS NULL
   * - 'deleted' — deleted_at IS NOT NULL (휴지통)
   * - 'all'     — both
   */
  scope?: "active" | "deleted" | "all";
}

async function fetchTypeLookups(): Promise<{
  proposalRows: TypeStub[];
  siteRows: TypeStub[];
}> {
  const supabase = await createClient();
  const [pt, st] = await Promise.all([
    supabase
      .from("catalog_proposal_types")
      .select("id, slug, name")
      .returns<TypeStub[]>(),
    supabase
      .from("catalog_site_types")
      .select("id, slug, name")
      .returns<TypeStub[]>(),
  ]);
  if (pt.error) throw pt.error;
  if (st.error) throw st.error;
  return {
    proposalRows: pt.data ?? [],
    siteRows: st.data ?? [],
  };
}

function decorate(
  row: Catalog,
  proposalById: Map<string, TypeStub>,
  siteById: Map<string, TypeStub>,
): CatalogWithLabels {
  return {
    ...row,
    proposal_type: row.proposal_type_id
      ? (proposalById.get(row.proposal_type_id) ?? null)
      : null,
    site_type: row.site_type_id
      ? (siteById.get(row.site_type_id) ?? null)
      : null,
  };
}

export async function listCatalogs(
  params: ListCatalogsParams = {},
): Promise<CatalogWithLabels[]> {
  const supabase = await createClient();
  const { proposalRows, siteRows } = await fetchTypeLookups();

  const proposalById = new Map(proposalRows.map((t) => [t.id, t]));
  const siteById = new Map(siteRows.map((t) => [t.id, t]));
  const slugToProposalId = new Map(proposalRows.map((t) => [t.slug, t.id]));
  const slugToSiteId = new Map(siteRows.map((t) => [t.slug, t.id]));

  const proposalIds = (params.proposalSlugs ?? [])
    .map((s) => slugToProposalId.get(s))
    .filter((v): v is string => Boolean(v));
  const siteIds = (params.siteSlugs ?? [])
    .map((s) => slugToSiteId.get(s))
    .filter((v): v is string => Boolean(v));

  let query = supabase.from("catalogs").select("*");

  const scope = params.scope ?? "active";
  if (scope === "active") query = query.is("deleted_at", null);
  else if (scope === "deleted")
    query = query.not("deleted_at", "is", null);

  const q = params.q?.trim();
  if (q) {
    const safe = q.replace(/[%_]/g, "\\$&");
    query = query.or(
      `site_name.ilike.%${safe}%,customer_name.ilike.%${safe}%,catalog_url.ilike.%${safe}%`,
    );
  }

  if (proposalIds.length > 0) query = query.in("proposal_type_id", proposalIds);
  if (siteIds.length > 0) query = query.in("site_type_id", siteIds);

  const sort = params.sort ?? "newest";
  if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "name") {
    query = query.order("site_name", { ascending: true });
  } else if (sort === "customer") {
    query = query
      .order("customer_name", { ascending: true })
      .order("site_name", { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => decorate(row, proposalById, siteById));
}

export async function getCatalog(
  id: string,
): Promise<CatalogWithLabels | null> {
  const supabase = await createClient();
  const { proposalRows, siteRows } = await fetchTypeLookups();
  const proposalById = new Map(proposalRows.map((t) => [t.id, t]));
  const siteById = new Map(siteRows.map((t) => [t.id, t]));

  const { data, error } = await supabase
    .from("catalogs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return decorate(data, proposalById, siteById);
}

export async function getCatalogDownloadIndex(
  catalog: Pick<
    Catalog,
    "id" | "customer_name" | "proposal_type_id" | "created_at"
  >,
): Promise<number> {
  if (!catalog.proposal_type_id) return 1;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogs")
    .select("id, created_at")
    .is("deleted_at", null)
    .eq("customer_name", catalog.customer_name)
    .eq("proposal_type_id", catalog.proposal_type_id)
    .order("created_at", { ascending: true })
    .returns<Array<{ id: string; created_at: string }>>();
  if (error) throw error;
  const idx = (data ?? []).findIndex((r) => r.id === catalog.id);
  return idx >= 0 ? idx + 1 : 1;
}

// --- Writes (admin client, bypasses RLS) -----------------------------------

export async function createCatalog(input: CatalogInsert): Promise<Catalog> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("catalogs")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCatalog(
  id: string,
  patch: CatalogUpdate,
): Promise<Catalog | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("catalogs")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteCatalog(id: string): Promise<Catalog | null> {
  return updateCatalog(id, { deleted_at: new Date().toISOString() });
}

export async function restoreCatalog(id: string): Promise<Catalog | null> {
  return updateCatalog(id, { deleted_at: null });
}

export async function hardDeleteCatalog(id: string): Promise<boolean> {
  const admin = getAdminClient();
  const { error } = await admin.from("catalogs").delete().eq("id", id);
  if (error) throw error;
  return true;
}
