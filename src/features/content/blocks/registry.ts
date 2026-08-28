// Glass — registro de bloques del CMS (§11.1). Agregar un bloque = un esquema,
// una entrada acá y un componente en `../components/blocks`.
import type { z } from "zod";
import {
  BentoData,
  type BlockType,
  CtaWhatsappData,
  FaqData,
  GalleryData,
  HeroData,
  MapContactData,
  PostsData,
  ProductGridData,
  TestimonialsData,
  TextMediaData,
} from "./schemas";

export interface BlockDef {
  label: string;
  schema: z.ZodTypeAny;
  defaultData: unknown;
}

export const BLOCKS: Record<BlockType, BlockDef> = {
  HERO: {
    label: "Portada",
    schema: HeroData,
    defaultData: HeroData.parse({ title: "Tu comercio, en línea" }),
  },
  BENTO: {
    label: "Mosaico (bento)",
    schema: BentoData,
    defaultData: BentoData.parse({}),
  },
  PRODUCT_GRID: {
    label: "Grilla de productos",
    schema: ProductGridData,
    defaultData: ProductGridData.parse({}),
  },
  TEXT_MEDIA: {
    label: "Texto e imagen",
    schema: TextMediaData,
    defaultData: TextMediaData.parse({}),
  },
  GALLERY: {
    label: "Galería",
    schema: GalleryData,
    defaultData: GalleryData.parse({}),
  },
  TESTIMONIALS: {
    label: "Testimonios",
    schema: TestimonialsData,
    defaultData: TestimonialsData.parse({}),
  },
  FAQ: {
    label: "Preguntas frecuentes",
    schema: FaqData,
    defaultData: FaqData.parse({}),
  },
  MAP_CONTACT: {
    label: "Mapa y contacto",
    schema: MapContactData,
    defaultData: MapContactData.parse({}),
  },
  CTA_WHATSAPP: {
    label: "Franja de WhatsApp",
    schema: CtaWhatsappData,
    defaultData: CtaWhatsappData.parse({ heading: "¿Hablamos?" }),
  },
  POSTS: {
    label: "Últimas del blog",
    schema: PostsData,
    defaultData: PostsData.parse({}),
  },
};

export function isBlockType(v: string): v is BlockType {
  return v in BLOCKS;
}

/** Valida el `data` de un bloque contra su esquema; lanza si no encaja. */
export function parseBlockData(type: BlockType, data: unknown): unknown {
  return BLOCKS[type].schema.parse(data);
}
