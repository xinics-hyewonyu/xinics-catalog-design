import type { Metadata } from "next";
import { Info, Trash2 } from "lucide-react";
import Link from "next/link";
import { CatalogCard } from "@/components/catalog/catalog-card";
import { CatalogDetailModal } from "@/components/catalog/catalog-detail-modal";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { CatalogListHeader } from "@/components/catalog/catalog-list-header";
import { NewCatalogButton } from "@/components/catalog/new-catalog-button";
import { getRequestAccess } from "@/lib/auth/ip-check";
import {
  getCatalog,
  getCatalogDownloadIndex,
  listCatalogs,
} from "@/lib/data/catalogs";
import { listEditLogsForCatalog } from "@/lib/data/edit-logs";
import { listProposalTypes, listSiteTypes } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type SortKey = "newest" | "oldest" | "name" | "customer";

function parseSort(v: string | undefined): SortKey {
  if (v === "oldest" || v === "customer" || v === "name") return v;
  return "newest";
}

function parseIds(v: string | undefined): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

// Default site-type filter when the URL has no `site` param yet.
// A present-but-empty `site=` means the user has explicitly cleared filters.
const DEFAULT_SITE_SLUGS = ["basic", "open_campus"];

const DEFAULT_META: Metadata = {
  title: "자이닉스 디자인 라이브러리",
  description: "자이닉스 사내 디자인 시안 라이브러리",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ catalog?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  if (!params.catalog) return DEFAULT_META;

  const catalog = await getCatalog(params.catalog);
  if (!catalog) return DEFAULT_META;

  // 외부 사용자가 final 외 카탈로그 링크를 받았다면 기본 메타 (정보 누설 방지)
  const { isAllowed } = await getRequestAccess();
  if (!isAllowed && catalog.proposal_type?.slug !== "final") {
    return DEFAULT_META;
  }

  const title = `${catalog.site_name} · ${catalog.customer_name}`;
  const description = catalog.site_type?.name
    ? `${catalog.customer_name} · ${catalog.site_type.name}`
    : catalog.customer_name;
  const images = catalog.image_url
    ? [{ url: catalog.image_url }]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: catalog.image_url ? [catalog.image_url] : undefined,
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    proposal?: string;
    site?: string;
    sort?: string;
    catalog?: string;
  }>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const proposalSlugs = parseIds(params.proposal);
  const siteSlugs =
    params.site === undefined ? DEFAULT_SITE_SLUGS : parseIds(params.site);
  const q = params.q?.trim() || undefined;

  const { isAllowed } = await getRequestAccess();

  // 비허용 IP: 시안 종류 필터를 무조건 'final'로 덮어씀 (외부 노출은 최종 시안만)
  const effectiveProposalSlugs = isAllowed ? proposalSlugs : ["final"];

  const [proposalTypes, siteTypes, catalogs, rawCatalog] =
    await Promise.all([
      listProposalTypes(),
      listSiteTypes(),
      listCatalogs({
        q,
        proposalSlugs: effectiveProposalSlugs,
        siteSlugs,
        sort,
      }),
      params.catalog ? getCatalog(params.catalog) : Promise.resolve(null),
    ]);

  // 직링크로 final 외 카탈로그 접근 시 모달 안 열림
  const selectedCatalog =
    rawCatalog &&
    !isAllowed &&
    rawCatalog.proposal_type?.slug !== "final"
      ? null
      : rawCatalog;

  const downloadIndex = selectedCatalog
    ? await getCatalogDownloadIndex(selectedCatalog)
    : 1;
  const editLogs = selectedCatalog
    ? await listEditLogsForCatalog(selectedCatalog.id)
    : [];

  const filtered =
    Boolean(q) || proposalSlugs.length > 0 || siteSlugs.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-lg p-md sm:p-xl">
      {!isAllowed ? (
        <div className="flex items-center gap-xs rounded-md border border-info-border bg-info-bg px-md py-sm text-xs text-info-text">
          <Info aria-hidden className="size-3.5 shrink-0" />
          <span>
            외부 공유 모드 — 최종 시안만 표시되며, 편집과 사내 자료는
            지정된 IP에서만 가능합니다.
          </span>
        </div>
      ) : null}

      <header className="flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-xxs">
          <h1 className="text-xxl font-semibold text-text-heading">
            자이닉스 디자인 라이브러리
          </h1>
          <p className="text-sm text-text-caption">
            전체 {catalogs.length}건
          </p>
        </div>
        {isAllowed ? (
          <div className="flex items-center gap-sm">
            <Link
              href="/trash"
              className="inline-flex items-center gap-xxs text-sm text-text-caption transition-colors hover:text-text-body"
            >
              <Trash2 aria-hidden className="size-4" />
              휴지통
            </Link>
            <NewCatalogButton
              proposalTypes={proposalTypes}
              siteTypes={siteTypes}
            />
          </div>
        ) : null}
      </header>

      <CatalogListHeader
        proposalTypes={proposalTypes}
        siteTypes={siteTypes}
      />

      {catalogs.length === 0 ? (
        <CatalogEmpty filtered={filtered} />
      ) : (
        <section
          aria-label="카탈로그 목록"
          className="grid grid-cols-1 gap-x-md gap-y-lg sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {catalogs.map((c) => (
            <CatalogCard key={c.id} catalog={c} />
          ))}
        </section>
      )}

      <CatalogDetailModal
        catalog={selectedCatalog}
        downloadIndex={downloadIndex}
        editLogs={editLogs}
        proposalTypes={proposalTypes}
        siteTypes={siteTypes}
      />
    </main>
  );
}
