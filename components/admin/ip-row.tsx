"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  removeAllowedIpAction,
  toggleAllowedIpAction,
} from "@/app/actions/allowed-ips";
import { Tag } from "@/components/xds/tag";
import type { AllowedIp } from "@/lib/data/allowed-ips";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

interface Props {
  ip: AllowedIp;
  isCurrent: boolean;
}

export function IpRow({ ip, isCurrent }: Props) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const r = await toggleAllowedIpAction(ip.id, !ip.is_active);
      if (!r.ok) toast.error(r.error);
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `'${ip.label}' (${ip.ip_address}) IP를 삭제하시겠습니까?\n이 IP에서 접속 중이라면 즉시 권한을 잃습니다.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await removeAllowedIpAction(ip.id);
      if (r.ok) toast.success("삭제되었습니다");
      else toast.error(r.error);
    });
  }

  return (
    <tr className="border-b border-border-subtle text-sm">
      <td className="py-sm pl-md font-mono text-text-body">
        {ip.ip_address}
        {isCurrent ? (
          <Tag tone="success" size="sm" className="ml-xs">
            현재 접속
          </Tag>
        ) : null}
      </td>
      <td className="py-sm text-text-body">{ip.label}</td>
      <td className="py-sm">
        <label className="inline-flex cursor-pointer items-center gap-xs text-xs">
          <input
            type="checkbox"
            checked={ip.is_active}
            onChange={handleToggle}
            disabled={pending}
            className="size-4 cursor-pointer"
          />
          {ip.is_active ? "활성" : "비활성"}
        </label>
      </td>
      <td className="py-sm text-xs tabular-nums text-text-caption">
        {dateFormatter.format(new Date(ip.created_at))}
      </td>
      <td className="py-sm pr-md text-right">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-label={`${ip.label} 삭제`}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-text-caption transition-colors hover:bg-error-bg hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          <Trash2 aria-hidden className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}
