/**
 * 인증된 사용자임을 표시하는 cookie. 값은 ADMIN_PASSWORD와 동일하게 저장하고,
 * 매 요청에서 평문 비교로 검증한다. (V1 임시 인증 — V2에서 OAuth 재구현)
 *
 * Pure 함수 — Edge runtime (proxy.ts) / Server Component 양쪽에서 import 안전.
 */
export const ACCESS_COOKIE_NAME = "xc_access";

export function isAccessCookieValid(value: string | undefined): boolean {
  if (!value) return false;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return value === expected;
}
