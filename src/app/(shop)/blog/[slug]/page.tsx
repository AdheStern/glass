import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { getSiteSettings } from "@/db/settings";
import { BlockImage } from "@/features/content/components/block-image";
import { BlockRenderer } from "@/features/content/components/block-renderer";
import {
  getPostBySlug,
  listPublishedPostSlugs,
} from "@/features/content/queries";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export async function generateStaticParams() {
  const slugs = await listPublishedPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getPostBySlug(slug),
    getSiteSettings(),
  ]);
  if (!post) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.publishedAt
      ? { datePublished: post.publishedAt.toISOString() }
      : {}),
    dateModified: post.updatedAt.toISOString(),
    ...(post.authorName
      ? { author: { "@type": "Person", name: post.authorName } }
      : {}),
    publisher: { "@type": "Organization", name: settings.name },
    url: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <JsonLd data={articleLd} />
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="text-sm text-black/45">
          {post.authorName ? `${post.authorName} · ` : ""}
          {post.publishedAt?.toLocaleDateString("es-BO") ?? ""}
        </p>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-black/5 px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
        )}
      </header>
      {post.coverPath && (
        <BlockImage
          path={post.coverPath}
          alt={post.title}
          priority
          className="mb-8 h-auto w-full rounded-xl object-cover"
        />
      )}
      <BlockRenderer blocks={post.blocks} />
    </article>
  );
}
