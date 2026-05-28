"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { clearAccessAction } from "@/app/actions/access";
import { Button } from "@/components/xds/button";

export function ClearAccessButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function handleClick() {
    if (!confirm("로그아웃하시겠습니까?")) return;
    startTransition(async () => {
      await clearAccessAction();
      toast.success("로그아웃되었습니다");
      router.refresh();
    });
  }
  return (
    <Button
      type="button"
      variant="default"
      onClick={handleClick}
      loading={pending}
      iconLeading={<LogOut aria-hidden className="size-4" />}
    >
      로그아웃
    </Button>
  );
}
