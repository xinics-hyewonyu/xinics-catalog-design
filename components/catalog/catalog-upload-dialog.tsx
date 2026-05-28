"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { uploadCatalog } from "@/app/actions/upload-catalog";
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
import type { ProposalType, SiteType } from "@/lib/data/types";

const DESIGN_TOOLS = ["피그마", "HTML", "XD", "포토샵"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalTypes: ProposalType[];
  siteTypes: SiteType[];
}

export function CatalogUploadDialog({
  open,
  onOpenChange,
  proposalTypes,
  siteTypes,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [siteName, setSiteName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [proposalTypeId, setProposalTypeId] = useState("");
  const [siteTypeId, setSiteTypeId] = useState("");
  const [designTool, setDesignTool] = useState("");
  const [filePath, setFilePath] = useState("");
  const [catalogUrl, setCatalogUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [authorName, setAuthorName] = useState("");

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDragOver(false);
    setSiteName("");
    setCustomerName("");
    setProposalTypeId("");
    setSiteTypeId("");
    setDesignTool("");
    setFilePath("");
    setCatalogUrl("");
    setMemo("");
    setAuthorName("");
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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
    if (!file) {
      setErrors({ image: ["이미지를 선택해주세요"] });
      return;
    }
    const fd = new FormData();
    fd.set("image", file);
    fd.set("site_name", siteName);
    fd.set("customer_name", customerName);
    fd.set("proposal_type_id", proposalTypeId);
    fd.set("site_type_id", siteTypeId);
    fd.set("design_tool", designTool);
    fd.set("file_path", filePath);
    fd.set("catalog_url", catalogUrl);
    fd.set("memo", memo);
    fd.set("author_name", authorName);

    startTransition(async () => {
      const result = await uploadCatalog(fd);
      if (result.ok) {
        toast.success("카탈로그가 등록되었습니다");
        router.refresh();
        reset();
        onOpenChange(false);
      } else {
        toast.error(result.error);
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next && pending) return; // 업로드 중에는 닫지 않음
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>새 카탈로그 등록</ModalTitle>
          <ModalDescription>
            이미지와 분류 정보를 입력해주세요. <span className="text-error">*</span>{" "}
            표시는 필수.
          </ModalDescription>
        </ModalHeader>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ModalBody>
            <div className="flex flex-col gap-md p-lg">
              {/* Image upload */}
              <div className="flex flex-col gap-xs">
                <Label required>이미지</Label>
                {previewUrl ? (
                  <div className="relative h-40 w-full overflow-hidden rounded-md border border-border-default bg-surface-muted">
                    <Image
                      src={previewUrl}
                      alt="업로드 미리보기"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => handleFile(null)}
                      aria-label="이미지 제거"
                      className="absolute right-xs top-xs inline-flex size-7 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur hover:bg-black/80"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={[
                      "flex h-40 w-full flex-col items-center justify-center gap-xs rounded-md border-2 border-dashed text-text-caption transition-colors motion-reduce:transition-none",
                      dragOver
                        ? "border-primary bg-primary-bg text-primary-text"
                        : "border-border-default bg-surface-muted hover:border-border-strong",
                    ].join(" ")}
                  >
                    <ImagePlus aria-hidden className="size-8" />
                    <div className="text-sm font-medium text-text-body">
                      클릭 또는 드래그해서 이미지 업로드
                    </div>
                    <div className="text-xs">jpg · png · webp · 10MB 이하</div>
                  </button>
                )}
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

              {/* Site name */}
              <FieldRow label="사이트명" htmlFor="up-site-name" required error={errors.site_name?.[0]}>
                <Input
                  id="up-site-name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="예: 한양대학교 입학처 2026 카탈로그"
                />
              </FieldRow>

              {/* Customer */}
              <FieldRow label="고객명" htmlFor="up-customer" required error={errors.customer_name?.[0]}>
                <Input
                  id="up-customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="예: 한양대학교"
                />
              </FieldRow>

              {/* Proposal type + Site type */}
              <div className="grid gap-md sm:grid-cols-2">
                <FieldRow label="시안 종류" required error={errors.proposal_type_id?.[0]}>
                  <Select value={proposalTypeId} onValueChange={setProposalTypeId}>
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

              {/* Design tool */}
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

              {/* File path */}
              <FieldRow
                label="파일 경로"
                htmlFor="up-file-path"
                hint="Figma URL 또는 사내 폴더 UNC 경로(\\etc\…)"
                error={errors.file_path?.[0]}
              >
                <Input
                  id="up-file-path"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="\\etc\catalogs\..."
                />
              </FieldRow>

              {/* Catalog URL */}
              <FieldRow
                label="카탈로그 주소"
                htmlFor="up-catalog-url"
                hint="공개된 카탈로그 페이지 URL"
                error={errors.catalog_url?.[0]}
              >
                <Input
                  id="up-catalog-url"
                  type="url"
                  value={catalogUrl}
                  onChange={(e) => setCatalogUrl(e.target.value)}
                  placeholder="https://catalog.example.com/..."
                />
              </FieldRow>

              {/* Author */}
              <FieldRow
                label="작성자"
                htmlFor="up-author"
                hint="비워두면 '자이닉스'로 표시됩니다"
                error={errors.author_name?.[0]}
              >
                <Input
                  id="up-author"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="예: 유혜원"
                />
              </FieldRow>

              {/* Memo */}
              <FieldRow label="메모" htmlFor="up-memo" error={errors.memo?.[0]}>
                <Textarea
                  id="up-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                  placeholder="컨셉, 컬러, 특이사항 등"
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
              {pending ? "등록 중..." : "등록"}
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
