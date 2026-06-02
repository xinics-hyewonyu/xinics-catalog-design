import type { MetadataRoute } from "next";
import { getAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Sitemap.
 * - 메인 페이지
 * - 외부 공개 대상인 '최종 시안' 디자인 직링크들 (/design/[id])
 *
 * 1차/2차 시안과 삭제된 디자인, 어드민/휴지통 경로는 제외.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  try {
    const admin = getAdminClient();

    const { data: finalType } = await admin
      .from("catalog_proposal_types")
      .select("id")
      .eq("slug", "final")
      .maybeSingle();

    if (finalType) {
      const { data } = await admin
        .from("catalogs")
        .select("id, updated_at, image_url")
        .is("deleted_at", null)
        .eq("proposal_type_id", finalType.id);

      for (const row of data ?? []) {
        if (!row.image_url) continue;
        items.push({
          url: `${SITE_URL}/design/${row.id}`,
          lastModified: row.updated_at ? new Date(row.updated_at) : undefined,
          changeFrequency: "monthly",
          priority: 0.8,
        });
      }
    }
  } catch (err) {
    // sitemap 빌드 실패 시에도 메인 URL은 반환 — 빌드 안 깨지게.
    console.error("[sitemap] failed to enumerate /design routes:", err);
  }

  return items;
}
