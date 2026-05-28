import Link from "next/link";
import { AddCatalogTypeForm } from "@/components/admin/add-catalog-type-form";
import { CatalogTypeRow } from "@/components/admin/catalog-type-row";
import { listAllProposalTypes } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "시안 종류 관리 · 자이닉스 디자인 라이브러리",
};

export default async function ProposalTypesPage() {
  const items = await listAllProposalTypes();

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
          시안 종류 관리
        </h1>
        <p className="text-sm text-text-caption">
          1차 / 2차 / 최종 시안 같은 분류값을 추가·수정·숨김·삭제할 수
          있습니다. 외부 공유는 슬러그 <code className="font-mono">final</code>
          인 시안만 노출됩니다.
        </p>
      </header>

      <AddCatalogTypeForm kind="proposal" />

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
                  등록된 시안 종류가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <CatalogTypeRow key={it.id} kind="proposal" item={it} />
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
