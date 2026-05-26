import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/xds/card";
import { Tag } from "@/components/xds/tag";
import type { CatalogWithLabels } from "@/lib/data/catalogs";

interface Props {
  catalog: CatalogWithLabels;
}

export function CatalogCard({ catalog }: Props) {
  return (
    <Link
      href={`/?catalog=${catalog.id}`}
      scroll={false}
      aria-label={`${catalog.site_name} (${catalog.customer_name}) 상세 보기`}
      className="block focus-visible:outline-none"
    >
      <Card elevation="interactive" className="group">
        <div className="relative aspect-video w-full overflow-hidden bg-surface-muted">
          <Image
            src={catalog.thumbnail_url ?? "/placeholder-16x9.svg"}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-col gap-xs p-md">
          <div className="flex flex-col gap-xxs">
            <h3 className="break-keep text-md font-semibold text-text-heading">
              {catalog.site_name}
            </h3>
            <p className="text-xs text-text-caption">
              {catalog.customer_name}
            </p>
          </div>
          <div className="flex flex-wrap gap-xs">
            {catalog.proposal_type ? (
              <Tag tone="info">{catalog.proposal_type.name}</Tag>
            ) : null}
            {catalog.site_type ? (
              <Tag tone="default">{catalog.site_type.name}</Tag>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
