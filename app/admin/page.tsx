import { cookies } from "next/headers";
import Link from "next/link";
import { AccessForm } from "@/components/admin/access-form";
import { ClearAccessButton } from "@/components/admin/clear-access-button";
import {
  ACCESS_COOKIE_NAME,
  isAccessCookieValid,
} from "@/lib/auth/access-cookie";
import { getRequestAccess } from "@/lib/auth/ip-check";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "관리자 · 자이닉스 디자인 라이브러리",
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const cookieValid = isAccessCookieValid(
    cookieStore.get(ACCESS_COOKIE_NAME)?.value,
  );
  const { isAllowed, ip } = await getRequestAccess();

  // 비번 cookie 없고 IP도 허용되지 않은 경우 → 비번 입력 폼
  if (!cookieValid && !isAllowed) {
    return (
      <main className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col gap-lg p-md sm:p-xl">
        <header className="flex flex-col gap-xs">
          <h1 className="text-xxl font-semibold text-text-heading">
            관리자 인증
          </h1>
          <p className="text-sm text-text-caption">
            허용 IP에서 접속하지 않은 경우 비밀번호로 내부 모드를 활성화할 수
            있습니다.
          </p>
        </header>
        <AccessForm />
        <p className="text-xs text-text-caption">
          현재 접속 IP: <code className="font-mono">{ip ?? "확인 불가"}</code>
        </p>
      </main>
    );
  }

  // 인증된 상태 → 관리자 메뉴
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-lg p-md sm:p-xl">
      <header className="flex flex-col gap-xs">
        <Link
          href="/"
          className="text-xs text-text-caption transition-colors hover:text-text-body"
        >
          ← 메인으로
        </Link>
        <h1 className="text-xxl font-semibold text-text-heading">관리자</h1>
        <p className="text-sm text-text-caption">
          {cookieValid
            ? "비밀번호 인증으로 접속 중"
            : ip
              ? `허용 IP(${ip})로 접속 중`
              : "로컬 개발 모드 (dev) — 자동 풀 권한"}
        </p>
      </header>

      <nav>
        <ul className="flex flex-col gap-sm">
          <AdminMenuItem
            href="/admin/proposal-types"
            title="시안 종류 관리"
            description="1차 / 2차 / 최종 같은 시안 분류를 추가·수정합니다."
          />
          <AdminMenuItem
            href="/admin/site-types"
            title="사이트 종류 관리"
            description="기본 / 오픈캠퍼스 / CMS 등 사이트 분류를 관리합니다."
          />
          <AdminMenuItem
            href="/admin/allowed-ips"
            title="허용 IP 관리"
            description="내부 모드를 자동으로 받는 IP 목록을 관리합니다."
          />
        </ul>
      </nav>

      {cookieValid ? (
        <div className="flex justify-end">
          <ClearAccessButton />
        </div>
      ) : null}
    </main>
  );
}

function AdminMenuItem({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between rounded-md border border-border-default bg-white p-md transition-colors hover:bg-surface-muted"
      >
        <span className="flex flex-col gap-xxs">
          <span className="font-medium text-text-body">{title}</span>
          <span className="text-xs text-text-caption">{description}</span>
        </span>
        <span aria-hidden className="text-text-caption">
          →
        </span>
      </Link>
    </li>
  );
}
