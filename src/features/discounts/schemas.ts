import { z } from "zod";

export const DiscountInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Nombre obligatorio").max(80),
    scope: z.enum(["GLOBAL", "CATEGORY", "PRODUCT"]),
    kind: z.enum(["PERCENT", "AMOUNT"]),
    percent: z.coerce.number().int().min(1).max(90).optional(),
    amountBs: z.coerce.number().min(0.01).optional(),
    categoryId: z.string().nullable().optional(),
    productRefs: z.string().optional(), // SKU/códigos separados por coma o salto
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (d) => (d.kind === "PERCENT" ? d.percent != null : d.amountBs != null),
    {
      message: "Falta el valor del descuento",
      path: ["percent"],
    },
  )
  .refine((d) => (d.scope === "CATEGORY" ? !!d.categoryId : true), {
    message: "Elegí una categoría",
    path: ["categoryId"],
  });

export type DiscountInput = z.input<typeof DiscountInputSchema>;
