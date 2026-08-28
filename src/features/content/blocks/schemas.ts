// Glass — esquemas zod del `data` de cada bloque del CMS (§11.1). El editor
// produce estos objetos; la action los valida contra el registro antes de
// guardar. El texto enriquecido se sanea siempre.
import { z } from "zod";
import { sanitizeRichText } from "@/domain/rich-text";

export const BLOCK_TYPES = [
  "HERO",
  "BENTO",
  "PRODUCT_GRID",
  "TEXT_MEDIA",
  "GALLERY",
  "TESTIMONIALS",
  "FAQ",
  "MAP_CONTACT",
  "CTA_WHATSAPP",
  "POSTS",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

const richText = z.unknown().transform((v) => sanitizeRichText(v));
const path = z.string().trim().max(500).default("");
const shortText = z.string().trim().max(200);

export const HeroData = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(400).default(""),
  mediaPath: path,
  mediaKind: z.enum(["image", "video"]).default("image"),
  variant: z.enum(["center", "split", "minimal"]).default("center"),
  buttons: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        href: shortText.max(500),
      }),
    )
    .max(2)
    .default([]),
});

const BentoPiece = z.object({
  size: z.enum(["S", "M", "L", "XL"]).default("S"),
  kind: z
    .enum(["product", "category", "image", "text", "stat"])
    .default("text"),
  ref: z.string().trim().max(200).default(""),
  text: richText.optional(),
  imagePath: path,
  stat: z
    .object({
      value: z.string().trim().max(40),
      label: z.string().trim().max(60),
    })
    .optional(),
});

export const BentoData = z.object({
  pieces: z.array(BentoPiece).max(24).default([]),
});

export const ProductGridData = z.object({
  title: z.string().trim().max(120).default(""),
  mode: z
    .enum(["manual", "category", "featured", "discounted"])
    .default("featured"),
  productIds: z.array(z.string()).max(24).default([]),
  categorySlug: z.string().trim().max(120).default(""),
  limit: z.number().int().min(1).max(24).default(8),
});

export const TextMediaData = z.object({
  body: richText,
  imagePath: path,
  layout: z.enum(["media-left", "media-right"]).default("media-right"),
});

export const GalleryData = z.object({
  images: z
    .array(
      z.object({
        path: z.string().trim().min(1).max(500),
        alt: z.string().trim().max(160).default(""),
      }),
    )
    .max(24)
    .default([]),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
});

export const TestimonialsData = z.object({
  items: z
    .array(
      z.object({
        quote: z.string().trim().min(1).max(500),
        name: z.string().trim().min(1).max(80),
        photoPath: path,
      }),
    )
    .max(12)
    .default([]),
});

export const FaqData = z.object({
  items: z
    .array(z.object({ q: shortText.min(1), a: richText }))
    .max(30)
    .default([]),
});

export const MapContactData = z.object({
  showHours: z.boolean().default(true),
  showWhatsapp: z.boolean().default(true),
  mapEmbedUrl: z.string().trim().max(1000).default(""),
  address: z.string().trim().max(300).default(""),
});

export const CtaWhatsappData = z.object({
  heading: z.string().trim().min(1).max(160),
  buttonLabel: z.string().trim().min(1).max(40).default("Escribinos"),
  prefilledMessage: z.string().trim().max(400).default(""),
});

export const PostsData = z.object({
  title: z.string().trim().max(120).default("Del blog"),
  limit: z.number().int().min(1).max(12).default(3),
});
