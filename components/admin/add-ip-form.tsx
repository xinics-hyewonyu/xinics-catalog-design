"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addAllowedIpAction } from "@/app/actions/allowed-ips";
import { Button } from "@/components/xds/button";
import { Input } from "@/components/xds/input";
import { Label } from "@/components/xds/label";

interface Props {
  /** 현재 요청자의 IP — '내 IP 채우기' 버튼용 (없을 수도 있음) */
  currentIp: string | null;
}

export function AddIpForm({ currentIp }: Props) {
  const [ip, setIp] = useState("");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("ip_address", ip);
    fd.set("label", label);
    startTransition(async () => {
      const result = await addAllowedIpAction(fd);
      if (result.ok) {
        toast.success("IP가 등록되었습니다");
        setIp("");
        setLabel("");
        setErrors({});
      } else {
        toast.error(result.error);
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-md rounded-md border border-border-default bg-surface-default p-md"
    >
      <div className="grid gap-md sm:grid-cols-[2fr_3fr_auto] sm:items-end">
        <div className="flex flex-col gap-xs">
          <Label htmlFor="add-ip-address" required>
            IP 주소
          </Label>
          <Input
            id="add-ip-address"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="예: 61.82.188.188"
          />
          {errors.ip_address?.[0] ? (
            <p className="text-xs text-error">{errors.ip_address[0]}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-xs">
          <Label htmlFor="add-ip-label" required>
            라벨
          </Label>
          <Input
            id="add-ip-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: 회사 사무실, 유혜원 자택"
          />
          {errors.label?.[0] ? (
            <p className="text-xs text-error">{errors.label[0]}</p>
          ) : null}
        </div>
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "등록 중..." : "추가"}
        </Button>
      </div>
      {currentIp ? (
        <p className="text-xs text-text-caption">
          현재 접속 IP: <code className="font-mono">{currentIp}</code>{" "}
          <button
            type="button"
            onClick={() => setIp(currentIp)}
            className="cursor-pointer text-primary hover:underline"
          >
            내 IP 채우기
          </button>
        </p>
      ) : null}
    </form>
  );
}
