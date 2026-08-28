// Glass — forma de los comandos de la cola sin conexión (§17.1). El navegador los
// encola; `/api/sync/batch` los valida acá antes de aplicarlos.
import { z } from "zod";
import { isValidClientSaleId } from "@/domain/sale";

const money = z.number().int();
const optId = z.string().min(1).optional();

export const SalePayloadSchema = z.object({
  sessionId: z.string().min(1),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.number().int().positive().max(999),
        discountPercent: z.number().int().min(0).max(100).optional(),
      }),
    )
    .min(1),
  globalDiscountPercent: z.number().int().min(0).max(100).optional(),
  payments: z
    .array(
      z.object({
        methodId: z.string().min(1),
        amountBob: money.positive(),
      }),
    )
    .min(1),
  tenderedBob: money.nonnegative().optional(),
  orderId: optId,
  authorizedByOperatorId: optId.nullable().optional(),
});

export const VoidPayloadSchema = z.object({
  saleClientId: z.string().refine(isValidClientSaleId, "clientSaleId inválido"),
  reason: z.string().trim().min(3).max(200),
  authorizedByOperatorId: z.string().min(1),
});

export const CashMovementPayloadSchema = z.object({
  sessionId: z.string().min(1),
  kind: z.enum(["INGRESO", "RETIRO", "GASTO"]),
  amountBob: money.positive(),
  reason: z.string().trim().max(200).optional(),
  authorizedByOperatorId: optId.nullable().optional(),
});

export const SyncCommandSchema = z.object({
  clientId: z.string().refine(isValidClientSaleId, "clientId inválido"),
  deviceId: z.string().min(1),
  seq: z.number().int().positive(),
  kind: z.enum(["SALE", "VOID", "CASH_MOVEMENT"]),
  occurredAtDevice: z.string().datetime(),
  payload: z.unknown(),
});

export const SyncBatchSchema = z.object({
  commands: z.array(SyncCommandSchema).max(500),
});

export type SyncCommandDto = z.infer<typeof SyncCommandSchema>;
