// Glass — validación de inventario (§14). Dinero en centavos; nota obligatoria
// donde el plan la exige (MERMA, AJUSTE).
import { z } from "zod";

const centsFromBs = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === "number") return Math.round(v * 100);
    const clean = v
      .replace(/[^\d.,-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const n = Number.parseFloat(clean);
    return Number.isFinite(n) ? Math.round(n * 100) : Number.NaN;
  })
  .pipe(z.number().int().nonnegative("Monto inválido"));

// --- Ingreso (compra a proveedor, §14.1) ---
export const StockEntrySchema = z.object({
  note: z.string().trim().max(280).optional().or(z.literal("")),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.coerce.number().int().positive("Cantidad debe ser mayor a 0"),
        unitCostBob: centsFromBs.optional(),
      }),
    )
    .min(1, "Agregá al menos un producto"),
});
export type StockEntryInput = z.input<typeof StockEntrySchema>;

// --- Ajuste / merma (§14.1: nota obligatoria) ---
export const StockAdjustmentSchema = z
  .object({
    variantId: z.string().min(1),
    kind: z.enum(["AJUSTE", "MERMA"]),
    qty: z.coerce
      .number()
      .int()
      .refine((n) => n !== 0, "La cantidad no puede ser 0"),
    note: z.string().trim().min(3, "La nota es obligatoria").max(280),
  })
  .refine((v) => v.kind !== "MERMA" || v.qty < 0, {
    message: "Una merma resta: la cantidad debe ser negativa",
    path: ["qty"],
  });
export type StockAdjustmentInput = z.input<typeof StockAdjustmentSchema>;

// --- Toma de inventario (§14.3) ---
export const StockCountCreateSchema = z.object({
  scope: z.enum(["TODO", "CATEGORIA", "LIBRE"]),
  categoryId: z.string().optional().or(z.literal("")),
  note: z.string().trim().max(280).optional().or(z.literal("")),
});
export type StockCountCreateInput = z.input<typeof StockCountCreateSchema>;

export const CountLineSchema = z.object({
  stockCountId: z.string().min(1),
  variantId: z.string().min(1),
  countedQty: z.coerce.number().int().min(0, "No puede ser negativo"),
});
export type CountLineInput = z.input<typeof CountLineSchema>;

// --- Código interno (§15.2) ---
export const GenerateBarcodeSchema = z.object({
  variantIds: z.array(z.string().min(1)).min(1),
});
