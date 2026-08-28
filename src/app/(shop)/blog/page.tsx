import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/db/settings";
import { BlockImage } from "@/features/content/components/block-image";
import { listPublishedPosts } from "@/features/content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Blog · ${settings.name}`,
    alternates: { types: { "application/rss+xml": "/blog/feed.xml" } },
  };
}

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const { posts, page, totalPages } = await listPublishedPosts(
    Number.parseInt(p ?? "1", 10) || 1,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-black/50">Todavía no hay entradas.</p>
      ) : (
        <div className="flex flex-col divide-y divide-black/10">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex gap-4 py-5"
            >
              {post.coverPath && (
                <BlockImage
                  path={post.coverPath}
                  alt={post.title}
                  className="hidden size-28 shrink-0 rounded-lg object-cover sm:block"
                />
              )}
              <div className="flex flex-col gap-1">
                <span className="text-lg font-semibold">{post.title}</span>
                {post.publishedAt && (
                  <span className="text-xs text-black/45">
                    {post.publishedAt.toLocaleDateString("es-BO")}
                  </span>
                )}
                {post.excerpt && (
                  <span className="line-clamp-2 text-sm text-black/60">
                    {post.excerpt}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex gap-3 text-sm">
          {page > 1 && <Link href={`/blog?p=${page - 1}`}>← Anteriores</Link>}
          {page < totalPages && (
            <Link href={`/blog?p=${page + 1}`} className="ml-auto">
              Siguientes →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
