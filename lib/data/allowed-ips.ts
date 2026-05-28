import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type AllowedIp = Database["public"]["Tables"]["allowed_ips"]["Row"];

/** 활성/비활성 모두 포함, 최신 등록 우선. service-role로 조회 (RLS 우회). */
export async function listAllowedIps(): Promise<AllowedIp[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("allowed_ips")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAllowedIp(input: {
  ip_address: string;
  label: string;
}): Promise<AllowedIp> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("allowed_ips")
    .insert({
      ip_address: input.ip_address,
      label: input.label,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setAllowedIpActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("allowed_ips")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAllowedIp(id: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from("allowed_ips").delete().eq("id", id);
  if (error) throw error;
}
