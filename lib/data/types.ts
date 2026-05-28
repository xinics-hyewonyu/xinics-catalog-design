import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type ProposalType =
  Database["public"]["Tables"]["catalog_proposal_types"]["Row"];
export type SiteType =
  Database["public"]["Tables"]["catalog_site_types"]["Row"];

// --- Public reads (활성만, 카탈로그 폼/필터용) -------------------------------

export async function listProposalTypes(): Promise<ProposalType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_proposal_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listSiteTypes(): Promise<SiteType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_site_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// --- Admin reads (비활성 포함) ---------------------------------------------

export async function listAllProposalTypes(): Promise<ProposalType[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("catalog_proposal_types")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAllSiteTypes(): Promise<SiteType[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("catalog_site_types")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// --- Admin writes ----------------------------------------------------------

/** 새 항목의 sort_order는 현재 최댓값 + 1로 자동 부여. */
async function nextSortOrder(
  table: "catalog_proposal_types" | "catalog_site_types",
): Promise<number> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.sort_order ?? 0) + 1;
}

export async function createProposalType(input: {
  slug: string;
  name: string;
}): Promise<ProposalType> {
  const admin = getAdminClient();
  const sort_order = await nextSortOrder("catalog_proposal_types");
  const { data, error } = await admin
    .from("catalog_proposal_types")
    .insert({ slug: input.slug, name: input.name, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createSiteType(input: {
  slug: string;
  name: string;
}): Promise<SiteType> {
  const admin = getAdminClient();
  const sort_order = await nextSortOrder("catalog_site_types");
  const { data, error } = await admin
    .from("catalog_site_types")
    .insert({ slug: input.slug, name: input.name, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProposalTypeName(
  id: string,
  name: string,
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("catalog_proposal_types")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function updateSiteTypeName(
  id: string,
  name: string,
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("catalog_site_types")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function setProposalTypeActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("catalog_proposal_types")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function setSiteTypeActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("catalog_site_types")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProposalType(id: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("catalog_proposal_types")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSiteType(id: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from("catalog_site_types").delete().eq("id", id);
  if (error) throw error;
}
