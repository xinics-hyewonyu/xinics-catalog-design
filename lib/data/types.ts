import "server-only";
import type { Database } from "@/types/database.types";
import { readJson } from "./_io";

export type ProposalType = Database["public"]["Tables"]["catalog_proposal_types"]["Row"];
export type SiteType = Database["public"]["Tables"]["catalog_site_types"]["Row"];

export async function listProposalTypes(): Promise<ProposalType[]> {
  const rows = await readJson<ProposalType[]>("proposal-types.json");
  return rows
    .filter((r) => r.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function listSiteTypes(): Promise<SiteType[]> {
  const rows = await readJson<SiteType[]>("site-types.json");
  return rows
    .filter((r) => r.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}
