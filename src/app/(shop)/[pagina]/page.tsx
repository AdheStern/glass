import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/features/content/components/block-renderer";
import {
  getPageBySlug,
  listPublishedPageSlugs,
} from "@/features/content/queries";

export async function generateStaticParams() {
  const slugs = await listPublishedPageSlugs();
  return slugs.map((pagina) => ({ pagina }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pagina: string }>;
}): Promise<Metadata> {
  const { pagina } = await params;
  const page = await getPageBySlug(pagina);
  if (!page) return {};
  return {
    title: page.metaTitle || page.title,
    description: page.metaDesc || undefined,
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ pagina: string }>;
}) {
  const { pagina } = await params;
  const page = await getPageBySlug(pagina);
  if (!page) notFound();

  return (
    <article className="flex flex-col">
      <BlockRenderer blocks={page.blocks} />
    </article>
  );
}
