"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/xds/button";

export function NewCatalogButton() {
  return (
    <Button
      variant="primary"
      iconLeading={<Plus aria-hidden className="size-4" />}
      onClick={() => {
        toast("업로드 UI는 Stage 6에서 추가됩니다", {
          description:
            "그동안은 /data/catalogs.json에 직접 추가하거나 다음 작업 단계에서 폼이 생기면 사용해주세요.",
        });
      }}
    >
      새 카탈로그 등록
    </Button>
  );
}
