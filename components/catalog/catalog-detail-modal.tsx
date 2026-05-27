"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  restoreCatalogAction,
  softDeleteCatalogAction,
} from "@/app/actions/delete-catalog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import {
  Copy,
  Download,
  ExternalLink,
  History,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/xds/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/xds/modal";
import { Tag } from "@/components/xds/tag";
import { Tooltip } from "@/components/xds/tooltip";
import { Avatar } from "@/components/xds/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/xds/accordion";
import { copyToClipboard } from "@/lib/clipboard";
import { buildCatalogFilename, downloadImage } from "@/lib/download";
import type { CatalogWithLabels } from "@/lib/data/catalogs";
import type { EditLog } from "@/lib/data/edit-logs";
import type { ProposalType, SiteType } from "@/lib/data/types";
import { CatalogEditDialog } from "./catalog-edit-dialog";
import { CatalogLightbox } from "./catalog-lightbox";

interface Props {
  catalog: CatalogWithLabels | null;
  downloadIndex: number;
  editLogs: EditLog[];
  proposalTypes: ProposalType[];
  siteTypes: SiteType[];
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatLogDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FIELD_LABELS: Record<string, string> = {
  site_name: "사이트명",
  customer_name: "고객명",
  proposal_type_id: "시안 종류",
  site_type_id: "사이트 종류",
  design_tool: "디자인 툴",
  file_path: "파일 경로",
  catalog_url: "카탈로그 주소",
  memo: "메모",
  image_url: "이미지",
  thumbnail_url: "썸네일",
};

const ACTION_LABELS: Record<string, string> = {
  created: "등록",
  updated: "수정",
  deleted: "삭제",
  restored: "복원",
};

export function CatalogDetailModal({
  catalog,
  downloadIndex,
  editLogs,
  proposalTypes,
  siteTypes,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDownloading, startDownload] = useTransition();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const open = Boolean(catalog);

  if (!open) {
    if (lightboxOpen) setLightboxOpen(false);
    if (editOpen) setEditOpen(false);
    if (deleteOpen) setDeleteOpen(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("catalog");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }
  }

  async function handleConfirmedDelete() {
    if (!catalog) return;
    const result = await softDeleteCatalogAction(catalog.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDeleteOpen(false);
    // Close detail modal — soft-deleted rows aren't on the home list anymore.
    handleOpenChange(false);
    router.refresh();
    toast.success(`'${catalog.site_name}' 삭제됨`, {
      duration: 5000,
      action: {
        label: "실행 취소",
        onClick: async () => {
          const undo = await restoreCatalogAction(catalog.id);
          if (undo.ok) {
            toast.success("복원되었습니다");
            router.refresh();
          } else {
            toast.error(undo.error);
          }
        },
      },
    });
  }

  // The lightbox renders its own portal (no Radix Dialog); flipping modal=false
  // while it's open prevents Radix from inert-marking it. For the delete
  // confirm dialog we also flip non-modal — two modal=true Radix Dialogs at
  // once interfere with each other's DismissableLayer and the delete dialog
  // appears not to open.
  const isModal = !lightboxOpen && !deleteOpen;

  return (
    <>
      <Modal open={open} onOpenChange={handleOpenChange} modal={isModal}>
        {catalog ? (
          <Content
            catalog={catalog}
            downloadIndex={downloadIndex}
            editLogs={editLogs}
            proposalTypes={proposalTypes}
            siteTypes={siteTypes}
            isDownloading={isDownloading}
            startDownload={startDownload}
            lightboxOpen={lightboxOpen}
            setLightboxOpen={setLightboxOpen}
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        ) : null}
      </Modal>
      {catalog ? (
        <>
          <CatalogEditDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            catalog={catalog}
            proposalTypes={proposalTypes}
            siteTypes={siteTypes}
          />
          <DeleteConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            confirmText={catalog.customer_name}
            title="이 카탈로그를 삭제하시겠습니까?"
            description="삭제된 카탈로그는 30일간 휴지통에 보관되며, 그 후 영구 삭제됩니다."
            confirmLabel="삭제"
            hint="삭제 후 토스트의 '실행 취소'로 5초 내 되돌릴 수 있어요."
            onConfirm={handleConfirmedDelete}
          />
        </>
      ) : null}
    </>
  );
}

interface ContentProps {
  catalog: CatalogWithLabels;
  downloadIndex: number;
  editLogs: EditLog[];
  proposalTypes: ProposalType[];
  siteTypes: SiteType[];
  isDownloading: boolean;
  startDownload: (cb: () => void) => void;
  lightboxOpen: boolean;
  setLightboxOpen: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function Content({
  catalog: c,
  downloadIndex: idx,
  editLogs,
  proposalTypes,
  siteTypes,
  isDownloading,
  startDownload,
  lightboxOpen,
  setLightboxOpen,
  onEdit,
  onDelete,
}: ContentProps) {
  function handleDownload() {
    if (!c.image_url) {
      toast.error("다운로드할 이미지가 없습니다");
      return;
    }
    const filename = buildCatalogFilename({
      customerName: c.customer_name,
      proposalTypeName: c.proposal_type?.name ?? null,
      index: idx,
      imageUrl: c.image_url,
    });
    startDownload(async () => {
      try {
        await downloadImage(c.image_url!, filename);
        toast.success("다운로드를 시작했습니다", { description: filename });
      } catch (err) {
        toast.error("다운로드에 실패했습니다", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  async function handleCopyPath() {
    if (!c.file_path) return;
    const ok = await copyToClipboard(c.file_path);
    if (ok) toast.success("파일 경로를 복사했습니다");
    else toast.error("복사에 실패했습니다");
  }

  return (
    <>
      <ModalContent
        size="lg"
        onPointerDownOutside={(e) => {
          if (lightboxOpen) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (lightboxOpen) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (lightboxOpen) e.preventDefault();
        }}
      >
        <ModalHeader>
          <ModalTitle>{c.site_name}</ModalTitle>
          <ModalDescription>{c.customer_name}</ModalDescription>
        </ModalHeader>

        <ModalBody>
          <div className="grid gap-md p-lg md:grid-cols-[3fr_2fr] md:gap-lg">
            {/* 이미지 영역 */}
            <div className="flex min-w-0 flex-col gap-sm">
              <button
                type="button"
                onClick={() => c.image_url && setLightboxOpen(true)}
                aria-label="이미지 크게 보기"
                disabled={!c.image_url}
                className="group relative block w-full cursor-pointer overflow-hidden rounded-md bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] disabled:cursor-not-allowed"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image_url ?? "/placeholder-16x9.svg"}
                  alt={`${c.site_name} 시안 이미지`}
                  className="block h-auto w-full transition-transform duration-200 group-hover:scale-[1.01] motion-reduce:transition-none"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white motion-reduce:transition-none"
                >
                  크게 보기
                </span>
              </button>
              <Button
                variant="default"
                iconLeading={<Download aria-hidden className="size-4" />}
                onClick={handleDownload}
                loading={isDownloading}
                disabled={!c.image_url}
              >
                다운로드
              </Button>
            </div>

            {/* 정보 패널 */}
            <div className="flex min-w-0 flex-col gap-md">
              <div className="flex flex-wrap gap-xs">
                {c.proposal_type ? (
                  <Tag tone="info">{c.proposal_type.name}</Tag>
                ) : null}
                {c.site_type ? <Tag>{c.site_type.name}</Tag> : null}
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-md gap-y-sm text-sm">
                <InfoRow label="게시일시">
                  {dateFormatter.format(new Date(c.created_at))}
                </InfoRow>

                <InfoRow label="게시자">
                  <span className="inline-flex items-center gap-xs">
                    <Avatar size="xs" name="자이닉스" />
                    <span className="text-text-body">자이닉스</span>
                  </span>
                </InfoRow>

                {c.design_tool ? (
                  <InfoRow label="디자인 툴">{c.design_tool}</InfoRow>
                ) : null}

                {c.catalog_url ? (
                  <InfoRow label="카탈로그 주소">
                    <Link
                      href={c.catalog_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-xxs text-primary hover:underline"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {c.catalog_url}
                      </span>
                      <ExternalLink aria-hidden className="size-3 shrink-0" />
                    </Link>
                  </InfoRow>
                ) : null}

                {c.file_path ? (
                  <InfoRow label="파일 경로">
                    <span className="flex items-center gap-xs">
                      <code className="flex-1 min-w-0 truncate rounded bg-surface-muted px-xs py-[2px] text-xs font-mono text-text-body">
                        {c.file_path}
                      </code>
                      <Tooltip content="경로 복사">
                        <button
                          type="button"
                          onClick={handleCopyPath}
                          aria-label="파일 경로 복사"
                          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-text-caption transition-colors hover:bg-surface-muted hover:text-text-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] motion-reduce:transition-none"
                        >
                          <Copy aria-hidden className="size-3.5" />
                        </button>
                      </Tooltip>
                    </span>
                  </InfoRow>
                ) : null}

                {c.memo ? (
                  <InfoRow label="메모">
                    <p className="whitespace-pre-wrap leading-korean text-text-body">
                      {c.memo}
                    </p>
                  </InfoRow>
                ) : null}
              </dl>

              <Accordion
                type="single"
                collapsible
                className="border-t border-border-subtle pt-sm"
              >
                <AccordionItem value="edit-logs">
                  <AccordionTrigger>
                    <span className="inline-flex items-center gap-xs">
                      <History aria-hidden className="size-4" />
                      로그 ({editLogs.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <EditLogList
                      logs={editLogs}
                      proposalTypes={proposalTypes}
                      siteTypes={siteTypes}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="default"
            iconLeading={<Pencil aria-hidden className="size-4" />}
            onClick={onEdit}
          >
            수정
          </Button>
          <Button
            variant="danger"
            iconLeading={<Trash2 aria-hidden className="size-4" />}
            onClick={onDelete}
          >
            삭제
          </Button>
        </ModalFooter>
      </ModalContent>
      {c.image_url ? (
        <CatalogLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          imageUrl={c.image_url}
          alt={`${c.site_name} 시안 이미지`}
        />
      ) : null}
    </>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="pt-[2px] text-xs font-medium text-text-caption">
        {label}
      </dt>
      <dd className="min-w-0 text-text-body">{children}</dd>
    </>
  );
}

function EditLogList({
  logs,
  proposalTypes,
  siteTypes,
}: {
  logs: EditLog[];
  proposalTypes: ProposalType[];
  siteTypes: SiteType[];
}) {
  if (logs.length === 0) {
    return (
      <p className="text-xs text-text-caption">기록된 변경이 없습니다.</p>
    );
  }
  const proposalById = new Map(proposalTypes.map((t) => [t.id, t.name]));
  const siteById = new Map(siteTypes.map((t) => [t.id, t.name]));

  function resolveName(field: string, value: unknown): string {
    if (value == null) return "없음";
    const str = String(value);
    if (field === "proposal_type_id") return proposalById.get(str) ?? str;
    if (field === "site_type_id") return siteById.get(str) ?? str;
    if (field === "image_url" || field === "thumbnail_url") return "이미지";
    if (str.length > 40) return str.slice(0, 38) + "…";
    return str;
  }

  function summarize(log: EditLog): string[] {
    if (log.action === "created") return ["등록"];
    if (log.action === "deleted") return ["삭제"];
    if (log.action === "restored") return ["복원"];
    const changes = (log.changes ?? {}) as Record<
      string,
      { before?: unknown; after?: unknown }
    >;
    const entries: string[] = [];
    for (const [field, val] of Object.entries(changes)) {
      const label = FIELD_LABELS[field] ?? field;
      if (field === "image_url" || field === "thumbnail_url") {
        entries.push(`${label} 교체`);
        continue;
      }
      const before = resolveName(field, val.before);
      const after = resolveName(field, val.after);
      entries.push(`${label}: ${before} → ${after}`);
    }
    return entries.length > 0 ? entries : ["수정"];
  }

  return (
    <ol className="divide-y divide-border-subtle text-xs">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex flex-wrap items-baseline gap-x-sm gap-y-xxs py-xs"
        >
          <time
            className="shrink-0 tabular-nums text-text-caption"
            dateTime={log.created_at}
          >
            {formatLogDate(log.created_at)}
          </time>
          <span className="min-w-0 text-text-body">
            {summarize(log).join(", ")}
          </span>
        </li>
      ))}
    </ol>
  );
}
