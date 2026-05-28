import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRequestAccess } from "@/lib/auth/ip-check";
import { getCatalog } from "@/lib/data/catalogs";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

async function loadShareable(id: string) {
  const catalog = await getCatalog(id);
  if (!catalog || !catalog.image_url) return null;
  const { isAllowed } = await getRequestAccess();
  // 외부 노출은 최종 시안만 (허용 IP는 모두 가능)
  if (!isAllowed && catalog.proposal_type?.slug !== "final") return null;
  return catalog;
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { id } = await params;
  const catalog = await loadShareable(id);
  if (!catalog) {
    return { title: "자이닉스 디자인 라이브러리" };
  }
  const title = `${catalog.site_name} · ${catalog.customer_name}`;
  const description = catalog.site_type?.name
    ? `${catalog.customer_name} · ${catalog.site_type.name}`
    : catalog.customer_name;
  const images = catalog.image_url ? [{ url: catalog.image_url }] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, images, type: "article" },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: catalog.image_url ? [catalog.image_url] : undefined,
    },
  };
}

export default async function DesignSharePage({
  params,
}: {
  params: RouteParams;
}) {
  const { id } = await params;
  const catalog = await loadShareable(id);
  if (!catalog || !catalog.image_url) notFound();

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={catalog.image_url}
      alt={`${catalog.site_name} 시안 이미지`}
      className="block w-full"
    />
  );
}
