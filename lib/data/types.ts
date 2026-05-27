import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type ProposalType =
  Database["public"]["Tables"]["catalog_proposal_types"]["Row"];
export type SiteType =
  Database["public"]["Tables"]["catalog_site_types"]["Row"];

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
