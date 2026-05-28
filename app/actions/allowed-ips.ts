"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createAllowedIp,
  deleteAllowedIp,
  setAllowedIpActive,
} from "@/lib/data/allowed-ips";

const addSchema = z.object({
  ip_address: z
    .string()
    .trim()
    .min(1, "IP 주소를 입력해주세요")
    .max(45, "IP 주소가 너무 깁니다"),
  label: z.string().trim().min(1, "라벨을 입력해주세요"),
});

export type AddIpResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function addAllowedIpAction(
  formData: FormData,
): Promise<AddIpResult> {
  const parsed = addSchema.safeParse({
    ip_address: formData.get("ip_address") ?? "",
    label: formData.get("label") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "입력값을 확인해주세요",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  try {
    await createAllowedIp(parsed.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // unique violation
    if (msg.includes("allowed_ips_ip_address_uniq")) {
      return { ok: false, error: "이미 등록된 IP 주소입니다" };
    }
    if (msg.toLowerCase().includes("invalid input syntax for type inet")) {
      return { ok: false, error: "올바른 IP 주소 형식이 아닙니다" };
    }
    return { ok: false, error: `등록 실패: ${msg}` };
  }
  revalidatePath("/admin/allowed-ips");
  return { ok: true };
}

export async function toggleAllowedIpAction(
  id: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await setAllowedIpActive(id, isActive);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  revalidatePath("/admin/allowed-ips");
  return { ok: true };
}

export async function removeAllowedIpAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteAllowedIp(id);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  revalidatePath("/admin/allowed-ips");
  return { ok: true };
}
