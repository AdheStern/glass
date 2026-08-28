import Link from "next/link";
import { resolvePosts } from "../../blocks/resolve";
import { BlockImage } from "../block-image";

export async function PostsBlock({ data }: { data: unknown }) {
  const { title, posts } = await resolvePosts(data);
  if (posts.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <Link href="/blog" className="text-sm underline">
          Ver todo
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 hover:bg-black/[0.02]"
          >
            {p.coverPath && (
              <BlockImage
                path={p.coverPath}
                alt={p.title}
                className="aspect-video w-full rounded-lg object-cover"
              />
            )}
            <span className="font-medium">{p.title}</span>
            {p.excerpt && (
              <span className="line-clamp-2 text-sm text-black/60">
                {p.excerpt}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
