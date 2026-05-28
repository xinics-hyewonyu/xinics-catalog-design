import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * 요청 헤더에서 클라이언트 IP 추출. Vercel 환경 기준 우선순위:
 *   1) x-forwarded-for (가장 왼쪽 = 원본 클라이언트)
 *   2) x-real-ip
 *   3) x-vercel-forwarded-for
 * 헤더가 모두 없으면 null (로컬 개발 환경 등).
 *
 * Pure 함수 — middleware(Edge) / Server Component 양쪽에서 import 안전.
 */
export function getClientIp(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

/**
 * IP가 활성 allowed_ips에 있는지 조회. service-role로 RLS 우회.
 * 매칭은 정확히 일치하는 IP만 (CIDR 범위는 V2에서).
 *
 * Edge runtime에서도 동작하도록 supabase-js를 직접 생성 (getAdminClient는
 * server-only 의존성이라 middleware에서 못 씀).
 */
export async function isIpAllowed(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("allowed_ips")
    .select("id")
    .eq("ip_address", ip)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[ip-check] allowed_ips lookup failed:", error.message);
    return false;
  }
  return data !== null;
}
