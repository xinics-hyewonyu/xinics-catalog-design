"use client";

import { ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateCatalogAction } from "@/app/actions/update-catalog";
import { Button } from "@/components/xds/button";
import { Input } from "@/components/xds/input";
import { Label } from "@/components/xds/label";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/xds/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/xds/select";
import { Textarea } from "@/components/xds/textarea";
import type { CatalogWithLabels } from "@/lib/data/catalogs";
import type { ProposalType, SiteType } from "@/lib/data/types";

const DESIGN_TOOLS = ["피그마", "HTML", "XD", "포토샵"];

/** ISO → YYYY-MM-DD in Asia/Seoul. en-CA locale formats as YYYY-MM-DD. */
function isoToKstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: CatalogWithLabels;
  proposalTypes: ProposalType[];
  siteTypes: SiteType[];
}

export function CatalogEditDialog({
  open,
  onOpenChange,
  catalog,
  proposalTypes,
  siteTypes,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [siteName, setSiteName] = useState(catalog.site_name);
  const [customerName, setCustomerName] = useState(catalog.customer_name);
  const [proposalTypeId, setProposalTypeId] = useState(
    catalog.proposal_type_id ?? "",
  );
  const [siteTypeId, setSiteTypeId] = useState(catalog.site_type_id ?? "");
  const [designTool, setDesignTool] = useState(catalog.design_tool ?? "");
  const [filePath, setFilePath] = useState(catalog.file_path ?? "");
  const [catalogUrl, setCatalogUrl] = useState(catalog.catalog_url ?? "");
  const [memo, setMemo] = useState(catalog.memo ?? "");
  const [authorName, setAuthorName] = useState(catalog.author_name ?? "");
  const [createdAtDate, setCreatedAtDate] = useState(
    isoToKstDate(catalog.created_at),
  );

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  // When the dialog (re)opens, reset to the catalog's current values.
  useEffect(() => {
    if (!open) return;
    setSiteName(catalog.site_name);
    setCustomerName(catalog.customer_name);
    setProposalTypeId(catalog.proposal_type_id ?? "");
    setSiteTypeId(catalog.site_type_id ?? "");
    setDesignTool(catalog.design_tool ?? "");
    setFilePath(catalog.file_path ?? "");
    setCatalogUrl(catalog.catalog_url ?? "");
    setMemo(catalog.memo ?? "");
    setAuthorName(catalog.author_name ?? "");
    setCreatedAtDate(isoToKstDate(catalog.created_at));
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, catalog]);

  function handleFile(f: File | null | undefined) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setErrors((e) => ({ ...e, image: [] }));
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("catalog_id", catalog.id);
    if (file) fd.set("image", file);
    fd.set("site_name", siteName);
    fd.set("customer_name", customerName);
    fd.set("proposal_type_id", proposalTypeId);
    fd.set("site_type_id", siteTypeId);
    fd.set("design_tool", designTool);
    fd.set("file_path", filePath);
    fd.set("catalog_url", catalogUrl);
    fd.set("memo", memo);
    fd.set("author_name", authorName);
    fd.set("created_at_date", createdAtDate);

    startTransition(async () => {
      const result = await updateCatalogAction(fd);
      if (result.ok) {
        toast.success("수정이 저장되었습니다");
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(result.error);
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next && pending) return;
    onOpenChange(next);
  }

  const currentImageUrl =
    previewUrl ?? catalog.image_url ?? "/placeholder-16x9.svg";

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>카탈로그 수정</ModalTitle>
          <ModalDescription>
            변경한 내용은 수정 로그에 기록됩니다.
          </ModalDescription>
        </ModalHeader>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ModalBody>
            <div className="flex flex-col gap-md p-lg">
              {/* Image */}
              <div className="flex flex-col gap-xs">
                <Label>이미지</Label>
                <div className="relative h-40 w-full overflow-hidden rounded-md border border-border-default bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImageUrl}
                    alt="이미지 미리보기"
                    className="absolute inset-0 size-full object-contain"
                  />
                  {file ? (
                    <button
                      type="button"
                      onClick={() => handleFile(null)}
                      aria-label="새 이미지 제거"
                      className="absolute right-xs top-xs inline-flex size-7 cursor-pointer items-center justify-center rounded-md bg-black/60 text-white backdrop-blur hover:bg-black/80"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  ) : null}
                </div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={[
                    "flex items-center justify-between gap-xs rounded-md border border-dashed px-md py-xs text-xs",
                    dragOver
                      ? "border-primary bg-primary-bg text-primary-text"
                      : "border-border-default bg-surface-muted text-text-caption",
                  ].join(" ")}
                >
                  <span className="inline-flex items-center gap-xs">
                    <ImagePlus aria-hidden className="size-4" />
                    이미지 교체 — 클릭 또는 드래그 (jpg · png · webp · 10MB)
                  </span>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    파일 선택
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {errors.image?.[0] ? (
                  <p className="text-xs text-error">{errors.image[0]}</p>
                ) : null}
              </div>

              <FieldRow
                label="사이트명"
                htmlFor="edit-site-name"
                required
                error={errors.site_name?.[0]}
              >
                <Input
                  id="edit-site-name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </FieldRow>

              <FieldRow
                label="고객명"
                htmlFor="edit-customer"
                required
                error={errors.customer_name?.[0]}
              >
                <Input
                  id="edit-customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </FieldRow>

              <div className="grid gap-md sm:grid-cols-2">
                <FieldRow
                  label="시안 종류"
                  required
                  error={errors.proposal_type_id?.[0]}
                >
                  <Select
                    value={proposalTypeId}
                    onValueChange={setProposalTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {proposalTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="사이트 종류" error={errors.site_type_id?.[0]}>
                  <Select value={siteTypeId} onValueChange={setSiteTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {siteTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>

              <FieldRow
                label="게시일"
                htmlFor="edit-created-at"
                hint="카탈로그 페이지가 처음 공개된 날짜 (KST)"
                error={errors.created_at_date?.[0]}
              >
                <Input
                  id="edit-created-at"
                  type="date"
                  value={createdAtDate}
                  onChange={(e) => setCreatedAtDate(e.target.value)}
                />
              </FieldRow>

              <FieldRow label="디자인 툴" error={errors.design_tool?.[0]}>
                <Select value={designTool} onValueChange={setDesignTool}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGN_TOOLS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow
                label="파일 경로"
                htmlFor="edit-file-path"
                hint="Figma URL 또는 사내 폴더 UNC 경로(\\etc\…)"
                error={errors.file_path?.[0]}
              >
                <Input
                  id="edit-file-path"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                />
              </FieldRow>

              <FieldRow
                label="카탈로그 주소"
                htmlFor="edit-catalog-url"
                hint="공개된 카탈로그 페이지 URL"
                error={errors.catalog_url?.[0]}
              >
                <Input
                  id="edit-catalog-url"
                  type="url"
                  value={catalogUrl}
                  onChange={(e) => setCatalogUrl(e.target.value)}
                />
              </FieldRow>

              <FieldRow
                label="작성자"
                htmlFor="edit-author"
                hint="비워두면 '자이닉스'로 표시됩니다"
                error={errors.author_name?.[0]}
              >
                <Input
                  id="edit-author"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </FieldRow>

              <FieldRow
                label="메모"
                htmlFor="edit-memo"
                error={errors.memo?.[0]}
              >
                <Textarea
                  id="edit-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                />
              </FieldRow>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="default"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {pending ? "저장 중..." : "저장"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

function FieldRow({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-error">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-caption">{hint}</p>
      ) : null}
    </div>
  );
}
