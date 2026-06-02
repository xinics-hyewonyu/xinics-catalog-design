import { SearchX } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "페이지를 찾을 수 없습니다 · 자이닉스 디자인 라이브러리",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[32rem] flex-1 flex-col items-center justify-center gap-md p-md text-center sm:p-xl">
      <SearchX
        aria-hidden
        className="size-12 text-text-caption"
        strokeWidth={1.5}
      />
      <h1 className="text-xxl font-semibold text-text-heading">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="text-sm leading-korean text-text-caption">
        주소가 잘못되었거나, 삭제된 디자인일 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-sm inline-flex h-[var(--xds-control-height-md)] items-center rounded-md bg-primary px-[var(--xds-control-padding-x)] text-sm font-medium text-text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] motion-reduce:transition-none"
      >
        메인으로
      </Link>
    </main>
  );
}
