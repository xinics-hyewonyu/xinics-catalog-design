"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/xds/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 로그에는 이미 찍히고, 클라이언트 콘솔에도 한 번 더.
    console.error("[app/error] caught:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="mx-auto flex w-full max-w-[36rem] flex-1 flex-col items-center justify-center gap-md p-md text-center sm:p-xl">
      <AlertCircle
        aria-hidden
        className="size-12 text-error"
        strokeWidth={1.5}
      />
      <h1 className="text-xxl font-semibold text-text-heading">
        오류가 발생했어요
      </h1>
      <p className="text-sm leading-korean text-text-caption">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 알려주세요.
      </p>

      {isDev && error.message ? (
        <pre className="mt-sm max-w-full overflow-x-auto rounded-md border border-border-default bg-surface-muted px-md py-sm text-left text-xs text-text-body">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      ) : error.digest ? (
        <p className="text-xs text-text-caption">
          오류 ID: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}

      <div className="mt-sm flex flex-wrap items-center justify-center gap-sm">
        <Button variant="primary" onClick={() => reset()}>
          다시 시도
        </Button>
        <Link
          href="/"
          className="inline-flex h-[var(--xds-control-height-md)] items-center rounded-md border border-border-default bg-surface-elevated px-[var(--xds-control-padding-x)] text-sm font-medium text-text-body transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] motion-reduce:transition-none"
        >
          메인으로
        </Link>
      </div>
    </main>
  );
}
