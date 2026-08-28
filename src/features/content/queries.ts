// Glass — lecturas del CMS (§11). Lo publicado se cachea con la etiqueta
// `content` (§10.2); el borrador por testigo nunca se cachea.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/db/client";
import type { BlockType } from "./blocks/schemas";
import type {
  ContentBlock,
  DraftView,
  PageView,
  PostCard,
  PostView,
} from "./types";

type BlockRow = { id: string; type: string; position: number; data: unknown };

function toBlocks(rows: BlockRow[]): ContentBlock[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.id,
      type: r.type as BlockType,
      position: r.position,
      data: r.data,
    }));
}

function toPageView(p: {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDesc: string | null;
  isHome: boolean;
  blocks: BlockRow[];
}): PageView {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    metaTitle: p.metaTitle,
    metaDesc: p.metaDesc,
    isHome: p.isHome,
    blocks: toBlocks(p.blocks),
  };
}

function toPostView(p: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverPath: string | null;
  authorName: string | null;
  tags: string[];
  publishedAt: Date | null;
  updatedAt: Date;
  blocks: BlockRow[];
}): PostView {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverPath: p.coverPath,
    authorName: p.authorName,
    tags: p.tags,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    blocks: toBlocks(p.blocks),
  };
}

export async function getHomePage(): Promise<PageView | null> {
  "use cache";
  cacheTag("content");
  cacheLife("hours");
  const page = await prisma.page.findFirst({
    where: { isHome: true, status: "PUBLISHED" },
    include: { blocks: true },
  });
  return page ? toPageView(page) : null;
}

export async function getPageBySlug(slug: string): Promise<PageView | null> {
  "use cache";
  cacheTag("content");
  cacheTag(`page:${slug}`);
  cacheLife("hours");
  const page = await prisma.page.findFirst({
    where: { slug, status: "PUBLISHED", isHome: false },
    include: { blocks: true },
  });
  return page ? toPageView(page) : null;
}

export async function listPublishedPageSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("content");
  cacheLife("hours");
  const rows = await prisma.page.findMany({
    where: { status: "PUBLISHED", isHome: false },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

const POSTS_PAGE_SIZE = 12;

export async function listPublishedPosts(page = 1): Promise<{
  posts: PostCard[];
  page: number;
  totalPages: number;
}> {
  "use cache";
  cacheTag("content");
  cacheLife("minutes");
  const current = Math.max(1, page);
  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      skip: (current - 1) * POSTS_PAGE_SIZE,
      take: POSTS_PAGE_SIZE,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverPath: true,
        publishedAt: true,
      },
    }),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
  ]);
  return {
    posts: rows,
    page: current,
    totalPages: Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE)),
  };
}

export async function getLatestPosts(limit = 3): Promise<PostCard[]> {
  "use cache";
  cacheTag("content");
  cacheLife("minutes");
  return prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: Math.min(12, Math.max(1, limit)),
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverPath: true,
      publishedAt: true,
    },
  });
}

export async function getPostBySlug(slug: string): Promise<PostView | null> {
  "use cache";
  cacheTag("content");
  cacheTag(`post:${slug}`);
  cacheLife("hours");
  const post = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { blocks: true },
  });
  return post ? toPostView(post) : null;
}

export async function listPublishedPostSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("content");
  cacheLife("hours");
  const rows = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/** Vista previa por testigo (§11.3). Sin caché: muestra el borrador tal cual. */
export async function getDraftByToken(
  token: string,
): Promise<DraftView | null> {
  const [page, post] = await Promise.all([
    prisma.page.findUnique({
      where: { draftToken: token },
      include: { blocks: true },
    }),
    prisma.post.findUnique({
      where: { draftToken: token },
      include: { blocks: true },
    }),
  ]);
  if (page) return { kind: "page", page: toPageView(page) };
  if (post) return { kind: "post", post: toPostView(post) };
  return null;
}
