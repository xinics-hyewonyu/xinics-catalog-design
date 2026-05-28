import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getClientIp, isIpAllowed } from "./ip-check-core";

export { getClientIp, isIpAllowed } from "./ip-check-core";

/**
 * Server Component / Server Action에서 현재 요청의 권한 상태를 가져옴.
 * React `cache()`로 같은 요청 내 중복 호출은 1회만 DB hit.
 *
 * Middleware(Edge runtime)에서는 이 함수 대신 ./ip-check-core 의
 * getClientIp(request.headers) + isIpAllowed(ip)를 직접 호출.
 */
export const getRequestAccess = cache(async (): Promise<{
  ip: string | null;
  isAllowed: boolean;
}> => {
  // 로컬 개발은 항상 풀 권한 (middleware도 동일하게 dev 우회).
  if (process.env.NODE_ENV === "development") {
    return { ip: null, isAllowed: true };
  }
  const h = await headers();
  const ip = getClientIp(h);
  const isAllowed = await isIpAllowed(ip);
  return { ip, isAllowed };
});
