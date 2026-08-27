// Glass — importador CSV (§19.2). Precios tolerantes, clave = código o SKU.
import { z } from "zod";

const DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  "g",
);

/** Acepta "1.234,56", "1234.56", "Bs 1.234,56", "1,234.56", "Bs. 45". */
export function parseMoneyBs(input: string): number | null {
  if (/-\s*\d/.test(input)) return null; // negativos no son precios
  let raw = input.replace(/[^\d.,]/g, "");
  raw = raw.replace(/^[.,]+/, ""); // "Bs." deja un "." inicial: es ruido
  if (!/\d/.test(raw)) return null;

  const m = raw.match(/[.,](\d{1,2})$/);
  let normalized: string;
  if (m && raw.length - m[0].length >= 1) {
    // separador decimal al final (1-2 dígitos); el resto son miles
    normalized = `${raw.slice(0, -m[0].length).replace(/[.,]/g, "")}.${m[1]}`;
  } else {
    normalized = raw.replace(/[.,]/g, "");
  }
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export const FIELD_KEYS = [
  "name",
  "priceBs",
  "barcode",
  "sku",
  "category",
  "description",
  "stock",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Nombre",
  priceBs: "Precio (Bs)",
  barcode: "Código de barras",
  sku: "SKU",
  category: "Categoría",
  description: "Descripción",
  stock: "Existencia inicial",
};

/** Una fila ya mapeada a nuestros campos. */
export const ImportRowSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto"),
  priceBob: z.number().int().nonnegative(),
  barcode: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
  stock: z.number().int().min(0).optional(),
});
export type ImportRow = z.infer<typeof ImportRowSchema>;

export interface MappingRequest {
  /** header del CSV → campo nuestro (o null para ignorar) */
  mapping: Record<string, FieldKey | null>;
  rows: Record<string, string>[];
}

export function autoMap(headers: string[]): Record<string, FieldKey | null> {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(DIACRITICS, "").trim();
  const guesses: Record<FieldKey, string[]> = {
    name: ["nombre", "producto", "descripcion corta", "articulo", "name"],
    priceBs: ["precio", "precio venta", "pvp", "price", "precio bs"],
    barcode: ["codigo", "codigo de barras", "barcode", "ean", "cod barra"],
    sku: ["sku", "codigo interno", "referencia", "ref"],
    category: ["categoria", "rubro", "familia", "category"],
    description: ["descripcion", "detalle", "description"],
    stock: ["stock", "existencia", "cantidad", "qty"],
  };
  const out: Record<string, FieldKey | null> = {};
  for (const h of headers) {
    const nh = norm(h);
    out[h] =
      (Object.entries(guesses).find(([, opts]) =>
        opts.includes(nh),
      )?.[0] as FieldKey) ?? null;
  }
  return out;
}
