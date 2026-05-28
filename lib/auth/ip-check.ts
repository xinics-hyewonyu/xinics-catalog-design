import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE_NAME, isAccessCookieValid } from "./access-cookie";
import { getClientIp, isIpAllowed } from "./ip-check-core";

export { getClientIp, isIpAllowed } from "./ip-check-core";

/**
 * Server Component / Server Action에서 현재 요청의 권한 상태를 가져옴.
 * 통과 조건: 허용 IP 또는 비밀번호 cookie 둘 중 하나.
 * React `cache()`로 같은 요청 내 중복 호출은 1회만 DB hit.
 *
 * Middleware(Edge runtime)에서는 이 함수 대신 ./ip-check-core 의
 * getClientIp(request.headers) + isIpAllowed(ip)를 직접 호출.
 */
export const getRequestAccess = cache(async (): Promise<{
  ip: string | null;
  isAllowed: boolean;
}> => {
  // 로컬 개발은 항상 풀 권한 (proxy도 동일하게 dev 우회).
  if (process.env.NODE_ENV === "development") {
    return { ip: null, isAllowed: true };
  }
  const cookieStore = await cookies();
  const cookieValid = isAccessCookieValid(
    cookieStore.get(ACCESS_COOKIE_NAME)?.value,
  );
  const h = await headers();
  const ip = getClientIp(h);
  // cookie가 유효하면 IP 조회 건너뜀 (DB hit 절약). 실제 IP는 그대로 노출 —
  // /admin/allowed-ips에서 '현재 접속 IP'를 보여주는 용도.
  if (cookieValid) return { ip, isAllowed: true };
  const isAllowed = await isIpAllowed(ip);
  return { ip, isAllowed };
});
