import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/design/"],
        // /admin, /trash 는 사내용 — 검색엔진 색인 차단
        // /design 직링크는 외부 공유 대상이므로 허용
        disallow: ["/admin", "/admin/", "/trash"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
