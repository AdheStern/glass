// Glass — validación del POS (§16). Dinero en centavos; PIN de 4 dígitos.
import { z } from "zod";
import { isValidClientSaleId } from "@/domain/sale";

const bsToCents = z
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

const pin = z.string().regex(/^\d{4}$/, "El PIN son 4 dígitos");

export const PairDeviceSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "El código son 6 dígitos"),
  name: z.string().trim().min(2, "Poné un nombre").max(60),
});

export const OpenShiftSchema = z.object({
  operatorId: z.string().min(1),
  pin,
  openingBs: bsToCents,
});

export const SaleLineSchema = z.object({
  variantId: z.string().min(1),
  qty: z.coerce.number().int().positive().max(999),
  discountPercent: z.coerce.number().int().min(0).max(100).optional(),
});

export const CreateSaleSchema = z.object({
  clientSaleId: z.string().refine(isValidClientSaleId, "clientSaleId inválido"),
  occurredAtDevice: z.coerce.date(),
  sessionId: z.string().min(1),
  lines: z.array(SaleLineSchema).min(1, "La venta necesita al menos una línea"),
  globalDiscountPercent: z.coerce.number().int().min(0).max(100).optional(),
  payments: z
    .array(
      z.object({
        methodId: z.string().min(1),
        amountBob: z.number().int().positive(),
      }),
    )
    .min(1),
  tenderedBob: z.number().int().nonnegative().optional(),
  orderId: z.string().optional(),
  authPin: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
});
export type CreateSaleInput = z.input<typeof CreateSaleSchema>;

export const CashMovementSchema = z.object({
  sessionId: z.string().min(1),
  kind: z.enum(["INGRESO", "RETIRO", "GASTO"]),
  amountBs: bsToCents,
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  authPin: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
});

export const CloseShiftSchema = z.object({
  sessionId: z.string().min(1),
  countedBs: bsToCents,
  note: z.string().trim().max(280).optional().or(z.literal("")),
});

export const VoidSaleSchema = z.object({
  saleId: z.string().min(1),
  authPin: pin,
  reason: z.string().trim().min(3, "Motivo obligatorio").max(200),
});
