"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  hardDeleteCatalogAction,
  restoreCatalogAction,
} from "@/app/actions/delete-catalog";
import { Button } from "@/components/xds/button";
import { Card } from "@/components/xds/card";
import { Tag } from "@/components/xds/tag";
import type { CatalogWithLabels } from "@/lib/data/catalogs";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

const RETENTION_DAYS = 30;

interface Props {
  catalog: CatalogWithLabels;
}

function daysRemaining(deletedAt: string | null): number {
  if (!deletedAt) return RETENTION_DAYS;
  const deletedMs = new Date(deletedAt).getTime();
  const elapsed = (Date.now() - deletedMs) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(RETENTION_DAYS - elapsed));
}

export function TrashCard({ catalog }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [permOpen, setPermOpen] = useState(false);

  const remaining = daysRemaining(catalog.deleted_at);
  const remainingTone = remaining <= 7 ? "danger" : remaining <= 14 ? "warning" : "default";

  function handleRestore() {
    startTransition(async () => {
      const r = await restoreCatalogAction(catalog.id);
      if (r.ok) {
        toast.success("복원되었습니다");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  async function handlePermanentDelete() {
    const r = await hardDeleteCatalogAction(catalog.id);
    if (r.ok) {
      toast.success("영구 삭제되었습니다");
      setPermOpen(false);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <>
      <Card elevation="raised" className="flex h-full flex-col">
        <div className="relative aspect-video w-full overflow-hidden bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={catalog.thumbnail_url ?? "/placeholder-16x9.svg"}
            alt=""
            className="size-full object-cover object-top opacity-70"
          />
        </div>
        <div className="flex flex-1 flex-col gap-xs p-md">
          <div className="flex flex-col gap-xxs">
            <h3 className="truncate text-md font-semibold text-text-heading">
              {catalog.site_name}
            </h3>
            <p className="text-xs text-text-caption">{catalog.customer_name}</p>
          </div>
          <div className="flex flex-wrap gap-xs">
            <Tag tone={remainingTone}>남은 보관 {remaining}일</Tag>
          </div>
          <div className="mt-auto flex items-center gap-xs pt-md">
            <Button
              type="button"
              variant="default"
              size="sm"
              iconLeading={<RotateCcw aria-hidden className="size-4" />}
              onClick={handleRestore}
              loading={pending}
            >
              복원
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              iconLeading={<Trash2 aria-hidden className="size-4" />}
              onClick={() => setPermOpen(true)}
              disabled={pending}
            >
              영구 삭제
            </Button>
          </div>
        </div>
      </Card>
      <DeleteConfirmDialog
        open={permOpen}
        onOpenChange={setPermOpen}
        confirmText={catalog.customer_name}
        title="영구 삭제 — 되돌릴 수 없어요"
        description={`'${catalog.site_name}'을(를) 영구 삭제합니다. 카탈로그 row와 Storage 이미지 + 수정 로그가 모두 함께 사라집니다.`}
        confirmLabel="영구 삭제"
        onConfirm={handlePermanentDelete}
      />
    </>
  );
}
