/**
 * 사이트 기본 URL — sitemap·robots·OG 메타에 사용.
 * Vercel/로컬 양쪽에서 안전한 절대 URL을 제공한다.
 *
 * 우선순위:
 *   1) NEXT_PUBLIC_SITE_URL  (직접 도메인 설정 시)
 *   2) prod 기본 Vercel 도메인
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://xinics-catalog-design.vercel.app";

export const SITE_NAME = "자이닉스 디자인 라이브러리";
export const SITE_DESCRIPTION = "자이닉스 사내 디자인 시안 라이브러리";
