import "server-only";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { data, error } = await supabase
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
