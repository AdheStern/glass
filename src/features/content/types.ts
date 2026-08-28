// Glass — tipos del CMS compartidos servidor ↔ componentes (sin `server-only`).
import type { BlockType } from "./blocks/schemas";

export interface ContentBlock {
  id: string;
  type: BlockType;
  position: number;
  data: unknown;
}

export interface PageView {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDesc: string | null;
  isHome: boolean;
  blocks: ContentBlock[];
}

export interface PostView {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverPath: string | null;
  authorName: string | null;
  tags: string[];
  publishedAt: Date | null;
  updatedAt: Date;
  blocks: ContentBlock[];
}

export interface PostCard {
  slug: string;
  title: string;
  excerpt: string | null;
  coverPath: string | null;
  publishedAt: Date | null;
}

export type DraftView =
  | { kind: "page"; page: PageView }
  | { kind: "post"; post: PostView };
