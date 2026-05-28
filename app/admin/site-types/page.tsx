import Link from "next/link";
import { AddCatalogTypeForm } from "@/components/admin/add-catalog-type-form";
import { CatalogTypeRow } from "@/components/admin/catalog-type-row";
import { listAllSiteTypes } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "사이트 종류 관리 · 자이닉스 디자인 라이브러리",
};

export default async function SiteTypesPage() {
  const items = await listAllSiteTypes();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-lg p-md sm:p-xl">
      <header className="flex flex-col gap-xs">
        <Link
          href="/admin"
          className="text-xs text-text-caption transition-colors hover:text-text-body"
        >
          ← 관리자로
        </Link>
        <h1 className="text-xxl font-semibold text-text-heading">
          사이트 종류 관리
        </h1>
        <p className="text-sm text-text-caption">
          기본 사이트 / 오픈캠퍼스 / CMS 등 카탈로그의 사이트 분류를
          관리합니다.
        </p>
      </header>

      <AddCatalogTypeForm kind="site" />

      <section className="overflow-hidden rounded-md border border-border-default bg-white">
        <table className="w-full border-collapse">
          <thead className="border-b border-border-default bg-surface-muted text-xs text-text-caption">
            <tr>
              <th className="py-sm pl-md text-left font-medium">No.</th>
              <th className="py-sm text-left font-medium">슬러그</th>
              <th className="py-sm text-left font-medium">표시 이름</th>
              <th className="py-sm text-left font-medium">상태</th>
              <th className="py-sm pr-md text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-lg text-center text-sm text-text-caption"
                >
                  등록된 사이트 종류가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <CatalogTypeRow key={it.id} kind="site" item={it} />
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
