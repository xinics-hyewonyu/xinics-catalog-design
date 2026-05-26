import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "로그인 | Xinics 카탈로그 아카이브",
};

// Reads auth cookies — must run per-request.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  // Already signed in → home (or `next` target)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(next ?? "/");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-md">
      <main className="flex w-full max-w-sm flex-col items-center gap-lg rounded-lg border border-border-subtle bg-surface-elevated p-xl">
        <header className="flex flex-col items-center gap-xs text-center">
          <h1 className="text-xl font-semibold text-text-heading">
            Xinics 카탈로그 아카이브
          </h1>
          <p className="text-sm text-text-caption">
            회사 Google 계정으로 로그인하세요.
          </p>
        </header>
        <LoginForm errorCode={error} nextPath={next} />
      </main>
    </div>
  );
}
