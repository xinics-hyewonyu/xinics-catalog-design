import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { TrashCard } from "@/components/catalog/trash-card";
import { listCatalogs } from "@/lib/data/catalogs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "휴지통 | Xinics 카탈로그 아카이브",
};

export default async function TrashPage() {
  const catalogs = await listCatalogs({ scope: "deleted", sort: "newest" });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-lg p-md sm:p-xl">
      <header className="flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-xxs">
          <Link
            href="/"
            className="inline-flex items-center gap-xxs text-xs text-text-caption hover:text-text-body"
          >
            <ArrowLeft aria-hidden className="size-3" />
            카탈로그로 돌아가기
          </Link>
          <h1 className="inline-flex items-center gap-xs text-xxl font-semibold text-text-heading">
            <Trash2 aria-hidden className="size-5" />
            휴지통
          </h1>
          <p className="text-sm text-text-caption">
            보관 중 {catalogs.length}건 · 삭제 후 30일이 지나면 자동으로 영구
            삭제됩니다.
          </p>
        </div>
      </header>

      {catalogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-md rounded-lg border border-dashed border-border-default bg-surface-elevated p-xxxl text-center">
          <Trash2 aria-hidden className="size-10 text-text-disabled" />
          <div className="flex flex-col gap-xs">
            <h2 className="text-md font-semibold text-text-heading">
              휴지통이 비어 있습니다
            </h2>
            <p className="text-sm text-text-caption">
              삭제한 카탈로그가 여기에 30일간 보관됩니다.
            </p>
          </div>
        </div>
      ) : (
        <section
          aria-label="휴지통 카탈로그"
          className="grid grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {catalogs.map((c) => (
            <TrashCard key={c.id} catalog={c} />
          ))}
        </section>
      )}
    </main>
  );
}
