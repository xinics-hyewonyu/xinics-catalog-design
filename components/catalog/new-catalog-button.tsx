"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/xds/button";
import { CatalogUploadDialog } from "./catalog-upload-dialog";
import type { ProposalType, SiteType } from "@/lib/data/types";

interface Props {
  proposalTypes: ProposalType[];
  siteTypes: SiteType[];
}

export function NewCatalogButton({ proposalTypes, siteTypes }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        iconLeading={<Plus aria-hidden className="size-4" />}
        onClick={() => setOpen(true)}
      >
        새 카탈로그 등록
      </Button>
      <CatalogUploadDialog
        open={open}
        onOpenChange={setOpen}
        proposalTypes={proposalTypes}
        siteTypes={siteTypes}
      />
    </>
  );
}
