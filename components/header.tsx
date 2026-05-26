import Link from "next/link";
import { getUser } from "@/lib/auth/get-user";
import { HeaderUserMenu } from "./header-user-menu";

export async function Header() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-elevated/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-md px-md">
        <Link
          href="/"
          className="text-md font-semibold text-text-heading hover:text-primary"
        >
          Xinics 카탈로그
        </Link>
        {user ? (
          <HeaderUserMenu
            email={user.email ?? ""}
            displayName={
              (user.user_metadata?.full_name as string | undefined) ?? null
            }
            avatarUrl={
              (user.user_metadata?.avatar_url as string | undefined) ?? null
            }
          />
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-text-body hover:text-primary"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
