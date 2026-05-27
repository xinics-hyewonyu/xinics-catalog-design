import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Database, Json, CatalogEditAction } from "@/types/database.types";

export type EditLog =
  Database["public"]["Tables"]["catalog_edit_logs"]["Row"];

export interface WriteEditLogInput {
  catalog_id: string;
  action: CatalogEditAction;
  changes: Json;
  actor_id?: string | null;
}

export async function listEditLogsForCatalog(
  catalogId: string,
): Promise<EditLog[]> {
  // RLS on catalog_edit_logs requires an authenticated user (auth.uid() is
  // not null). Auth is deferred (Stage 2), so reads go through the admin
  // client and bypass RLS. Swap back to the anon server client when Stage 2
  // re-introduces the logged-in session.
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("catalog_edit_logs")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function writeEditLog(input: WriteEditLogInput): Promise<EditLog> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("catalog_edit_logs")
    .insert({
      catalog_id: input.catalog_id,
      action: input.action,
      changes: input.changes,
      actor_id: input.actor_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
