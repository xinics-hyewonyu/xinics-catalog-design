"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitAccessAction } from "@/app/actions/access";
import { Button } from "@/components/xds/button";
import { Input } from "@/components/xds/input";
import { Label } from "@/components/xds/label";

export function AccessForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("password", password);
    startTransition(async () => {
      const result = await submitAccessAction(fd);
      if (result.ok) {
        toast.success("인증되었습니다 — 내부 모드로 전환됩니다");
        setError(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-md rounded-md border border-border-default bg-surface-default p-lg"
    >
      <div className="flex flex-col gap-xs">
        <Label htmlFor="access-password" required>
          관리자 비밀번호
        </Label>
        <Input
          id="access-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
        {error ? <p className="text-xs text-error">{error}</p> : null}
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        {pending ? "확인 중..." : "인증"}
      </Button>
    </form>
  );
}
