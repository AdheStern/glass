import { z } from "zod";
import { BLOCK_TYPES } from "./blocks/schemas";

export const BlockInputSchema = z.object({
  id: z.string().optional(),
  type: z.enum(BLOCK_TYPES),
  data: z.unknown(),
});

const optText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const PageInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Poné un título").max(160),
  slug: optText(160),
  metaTitle: optText(160),
  metaDesc: optText(320),
  isHome: z.boolean().default(false),
  blocks: z.array(BlockInputSchema).max(40).default([]),
});

export const PostInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Poné un título").max(160),
  slug: optText(160),
  excerpt: optText(320),
  coverPath: optText(500),
  authorName: optText(80),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  blocks: z.array(BlockInputSchema).max(40).default([]),
});

export type PageInput = z.input<typeof PageInputSchema>;
export type PostInput = z.input<typeof PostInputSchema>;
