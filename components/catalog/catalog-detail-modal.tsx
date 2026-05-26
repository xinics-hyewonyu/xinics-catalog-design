"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { CatalogLightbox } from "./catalog-lightbox";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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

interface Props {
  catalog: CatalogWithLabels | null;
  downloadIndex: number;
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CatalogDetailModal({ catalog, downloadIndex }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDownloading, startDownload] = useTransition();
  const open = Boolean(catalog);

  function handleOpenChange(next: boolean) {
    if (!next) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("catalog");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      {catalog ? (
        <CatalogDetailModalContent
          catalog={catalog}
          downloadIndex={downloadIndex}
          isDownloading={isDownloading}
          startDownload={startDownload}
        />
      ) : null}
    </Modal>
  );
}

function CatalogDetailModalContent({
  catalog: c,
  downloadIndex: idx,
  isDownloading,
  startDownload,
}: {
  catalog: CatalogWithLabels;
  downloadIndex: number;
  isDownloading: boolean;
  startDownload: (cb: () => void) => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
    if (ok) {
      toast.success("파일 경로를 복사했습니다");
    } else {
      toast.error("복사에 실패했습니다");
    }
  }

  return (
    <>
      <ModalContent
        size="lg"
        onPointerDownOutside={(e) => {
          // Lightbox is portaled to body; its clicks register as 'outside'
          // the Dialog content. Keep the dialog open while the lightbox owns
          // the interaction.
          if (lightboxOpen) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (lightboxOpen) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Let the lightbox swallow Esc instead of bubbling up to close the
          // dialog underneath.
          if (lightboxOpen) e.preventDefault();
        }}
      >
        <ModalHeader>
          <ModalTitle>{c.site_name}</ModalTitle>
          <ModalDescription>
            {c.customer_name}
            {c.domain ? ` · ${c.domain}` : ""}
          </ModalDescription>
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
                className="group relative aspect-video w-full overflow-hidden rounded-md bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] disabled:cursor-not-allowed"
              >
                <Image
                  src={c.image_url ?? "/placeholder-16x9.svg"}
                  alt={`${c.site_name} 시안 이미지`}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-contain transition-transform duration-200 group-hover:scale-[1.01] motion-reduce:transition-none"
                  priority
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
                    <Avatar size="xs" name={null} />
                    <span className="text-text-caption">미지정</span>
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
                          className="inline-flex size-7 items-center justify-center rounded-md text-text-caption hover:bg-surface-muted hover:text-text-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] transition-colors motion-reduce:transition-none"
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

              <Accordion type="single" collapsible className="border-t border-border-subtle pt-sm">
                <AccordionItem value="edit-logs">
                  <AccordionTrigger>
                    <span className="inline-flex items-center gap-xs">
                      <History aria-hidden className="size-4" />
                      수정 로그
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-text-caption">
                      수정 로그는 Stage 7 구현 시 표시됩니다.
                    </p>
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
            disabled
            title="Stage 7에서 추가 예정"
          >
            수정
          </Button>
          <Button
            variant="danger"
            iconLeading={<Trash2 aria-hidden className="size-4" />}
            disabled
            title="Stage 8에서 추가 예정"
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
      <dt className="text-xs font-medium text-text-caption pt-[2px]">{label}</dt>
      <dd className="min-w-0 text-text-body">{children}</dd>
    </>
  );
}
