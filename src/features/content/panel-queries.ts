import "server-only";
import { prisma } from "@/db/client";
import type { BlockType } from "./blocks/schemas";

export interface PanelDocRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: Date;
}

export interface PanelBlock {
  type: BlockType;
  data: unknown;
}

export interface PanelPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  isHome: boolean;
  metaTitle: string;
  metaDesc: string;
  draftToken: string | null;
  blocks: PanelBlock[];
}

export interface PanelPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string;
  coverPath: string;
  authorName: string;
  tags: string[];
  draftToken: string | null;
  blocks: PanelBlock[];
}

function sortBlocks(rows: { type: string; data: unknown; position: number }[]) {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((b) => ({ type: b.type as BlockType, data: b.data }));
}

export async function listPagesForPanel(): Promise<PanelDocRow[]> {
  return prisma.page.findMany({
    orderBy: [{ isHome: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function listPostsForPanel(): Promise<PanelDocRow[]> {
  return prisma.post.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function getPageForPanel(id: string): Promise<PanelPage | null> {
  const p = await prisma.page.findUnique({
    where: { id },
    include: { blocks: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    isHome: p.isHome,
    metaTitle: p.metaTitle ?? "",
    metaDesc: p.metaDesc ?? "",
    draftToken: p.draftToken,
    blocks: sortBlocks(p.blocks),
  };
}

export async function getPostForPanel(id: string): Promise<PanelPost | null> {
  const p = await prisma.post.findUnique({
    where: { id },
    include: { blocks: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    excerpt: p.excerpt ?? "",
    coverPath: p.coverPath ?? "",
    authorName: p.authorName ?? "",
    tags: p.tags,
    draftToken: p.draftToken,
    blocks: sortBlocks(p.blocks),
  };
}
