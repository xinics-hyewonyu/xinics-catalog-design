"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/xds/button";

const ERROR_MESSAGES: Record<string, string> = {
  domain: "회사 계정(@xinics.com)으로만 로그인 가능합니다.",
  oauth: "Google 로그인 중 문제가 발생했어요. 다시 시도해주세요.",
  config: "인증 설정이 완료되지 않았어요. 관리자에게 문의해주세요.",
};

export function LoginForm({
  errorCode,
  nextPath,
}: {
  errorCode?: string;
  nextPath?: string;
}) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      toast.error(ERROR_MESSAGES[errorCode]);
    }
  }, [errorCode]);

  async function handleSignIn() {
    setPending(true);
    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (nextPath) redirectTo.searchParams.set("next", nextPath);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(ERROR_MESSAGES.oauth);
        setPending(false);
      }
      // On success the browser navigates to Google; setPending stays true.
    } catch {
      toast.error(ERROR_MESSAGES.config);
      setPending(false);
    }
  }

  return (
    <Button
      variant="default"
      size="lg"
      className="w-full"
      loading={pending}
      onClick={handleSignIn}
      iconLeading={<GoogleMark />}
    >
      Google로 로그인
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.75h3.56c2.08-1.92 3.28-4.75 3.28-8.08Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.67l-3.56-2.75c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.85 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.45.35-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.67-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}
