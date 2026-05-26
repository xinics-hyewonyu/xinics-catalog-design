import { Plus } from "lucide-react";
import { Button } from "@/components/xds/button";
import { CatalogCard } from "@/components/catalog/catalog-card";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { CatalogListHeader } from "@/components/catalog/catalog-list-header";
import { listCatalogs } from "@/lib/data/catalogs";
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    proposal?: string;
    site?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const proposalTypeIds = parseIds(params.proposal);
  const siteTypeIds = parseIds(params.site);
  const q = params.q?.trim() || undefined;

  const [proposalTypes, siteTypes, catalogs] = await Promise.all([
    listProposalTypes(),
    listSiteTypes(),
    listCatalogs({ q, proposalTypeIds, siteTypeIds, sort }),
  ]);

  const filtered =
    Boolean(q) || proposalTypeIds.length > 0 || siteTypeIds.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-lg p-md sm:p-xl">
      <header className="flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-xxs">
          <h1 className="text-xxl font-semibold text-text-heading">
            카탈로그 아카이브
          </h1>
          <p className="text-sm text-text-caption">
            전체 {catalogs.length}건
          </p>
        </div>
        <Button
          variant="primary"
          iconLeading={<Plus aria-hidden className="size-4" />}
          disabled
          title="Stage 6에서 추가 예정"
        >
          새 카탈로그 등록
        </Button>
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
          className="grid grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {catalogs.map((c) => (
            <CatalogCard key={c.id} catalog={c} />
          ))}
        </section>
      )}
    </main>
  );
}
