import { Inbox } from "lucide-react";

interface Props {
  filtered: boolean;
}

export function CatalogEmpty({ filtered }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-md rounded-lg border border-dashed border-border-default bg-surface-elevated p-xxxl text-center">
      <Inbox aria-hidden className="size-10 text-text-disabled" />
      <div className="flex flex-col gap-xs">
        <h2 className="text-md font-semibold text-text-heading">
          {filtered ? "조건에 맞는 카탈로그가 없습니다" : "등록된 카탈로그가 없습니다"}
        </h2>
        <p className="text-sm text-text-caption">
          {filtered
            ? "검색어 또는 필터 조건을 바꿔보세요."
            : "Stage 6(생성) 단계에서 업로드 UI가 추가됩니다."}
        </p>
      </div>
    </div>
  );
}
