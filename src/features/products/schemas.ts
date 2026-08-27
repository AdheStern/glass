// Glass — validación de productos (§24.1: sufijo Schema, dinero en centavos).
import { z } from "zod";

const centsFromBs = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === "number") return Math.round(v * 100);
    // tolera "1.234,56", "1234.56", "Bs 1.234,56"
    const clean = v
      .replace(/[^\d.,-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const n = Number.parseFloat(clean);
    return Number.isFinite(n) ? Math.round(n * 100) : Number.NaN;
  })
  .pipe(z.number().int().nonnegative("Precio inválido"));

export const VariantInputSchema = z.object({
  id: z.string().optional(), // presente = actualizar
  sku: z.string().trim().max(64).optional().or(z.literal("")),
  barcode: z.string().trim().max(64).optional().or(z.literal("")),
  attributes: z.record(z.string(), z.string()).optional(),
  basePriceBob: centsFromBs,
  costBob: centsFromBs.optional(),
  minStock: z.coerce.number().int().min(0).default(0),
});

export const ProductInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, "Solo minúsculas, números y guiones")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  trackStock: z.boolean().default(true),
  categoryIds: z.array(z.string()).default([]),
  variants: z.array(VariantInputSchema).min(1, "Agregá al menos una variante"),
});

export type ProductInput = z.input<typeof ProductInputSchema>;
export type ProductParsed = z.output<typeof ProductInputSchema>;

const DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  "g",
);

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
