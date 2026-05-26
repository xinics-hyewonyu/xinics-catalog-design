import { getUser } from "@/lib/auth/get-user";

export default async function Home() {
  const user = await getUser();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-md p-xl">
      <h1 className="text-xxl font-semibold text-text-heading">
        Xinics 카탈로그 아카이브
      </h1>
      <p className="text-text-caption">
        Stage 2(인증) 완료. 다음 단계: DB 스키마 & RLS & Storage.
      </p>
      <div className="rounded-md border border-border-subtle bg-surface-elevated p-md text-sm">
        {user ? (
          <p>
            <span className="text-text-caption">로그인됨:</span>{" "}
            <span className="font-medium text-text-body">{user.email}</span>
          </p>
        ) : (
          <p className="text-text-caption">
            비로그인 상태입니다. 우측 상단 “로그인”에서 회사 계정으로
            로그인하세요.
          </p>
        )}
      </div>
    </main>
  );
}
