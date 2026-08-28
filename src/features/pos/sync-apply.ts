import "server-only";
// Glass — aplicación idempotente de un comando de la cola sin conexión (§17.2).
// Cada comando lleva `clientId` (idempotencia) y `seq` (orden por dispositivo).
import type { Device } from "@prisma/client";
import { prisma } from "@/db/client";
import { applySaleCommand } from "./apply-sale";
import {
  CashMovementPayloadSchema,
  SalePayloadSchema,
  type SyncCommandDto,
  VoidPayloadSchema,
} from "./sync-schemas";

export interface CommandAck {
  clientId: string;
  seq: number;
  folio: string | null;
  serverId: string;
}

export type CommandOutcome =
  | { ok: true; ack: CommandAck; negativeVariantIds?: string[] }
  | { ok: false; error: string };

async function applyVoid(
  cmd: SyncCommandDto,
  operatorId: string,
): Promise<CommandOutcome> {
  const p = VoidPayloadSchema.safeParse(cmd.payload);
  if (!p.success) return { ok: false, error: "Comando VOID inválido" };

  const sale = await prisma.sale.findUnique({
    where: { clientSaleId: p.data.saleClientId },
    include: { items: true, cashSession: { select: { closedAt: true } } },
  });
  if (!sale) return { ok: false, error: "La venta a anular no existe" };

  const ack: CommandAck = {
    clientId: cmd.clientId,
    seq: cmd.seq,
    folio: sale.folio,
    serverId: sale.id,
  };
  if (sale.voidedAt) return { ok: true, ack }; // ya aplicado

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        voidedAt: new Date(cmd.occurredAtDevice),
        voidReason: p.data.reason,
        authorizedByOperatorId: p.data.authorizedByOperatorId,
      },
    });
    await tx.stockMovement.createMany({
      data: sale.items.map((it) => ({
        variantId: it.variantId,
        kind: "DEVOLUCION" as const,
        qty: it.qty,
        occurredAt: new Date(cmd.occurredAtDevice),
        sourceType: "sale",
        sourceId: sale.id,
        operatorId: p.data.authorizedByOperatorId || operatorId,
      })),
    });
  });
  return { ok: true, ack };
}

async function applyCashMovement(cmd: SyncCommandDto): Promise<CommandOutcome> {
  const p = CashMovementPayloadSchema.safeParse(cmd.payload);
  if (!p.success) return { ok: false, error: "Comando de efectivo inválido" };

  const existing = await prisma.cashMovement.findUnique({
    where: { clientId: cmd.clientId },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: true,
      ack: {
        clientId: cmd.clientId,
        seq: cmd.seq,
        folio: null,
        serverId: existing.id,
      },
    };
  }

  const session = await prisma.cashSession.findUnique({
    where: { id: p.data.sessionId },
    select: { operatorId: true, closedAt: true },
  });
  if (!session) return { ok: false, error: "Turno inexistente" };

  const mv = await prisma.cashMovement.create({
    data: {
      cashSessionId: p.data.sessionId,
      kind: p.data.kind,
      amountBob: p.data.amountBob,
      reason: p.data.reason || null,
      operatorId: p.data.authorizedByOperatorId || session.operatorId,
      occurredAt: new Date(cmd.occurredAtDevice),
      clientId: cmd.clientId,
    },
  });
  return {
    ok: true,
    ack: { clientId: cmd.clientId, seq: cmd.seq, folio: null, serverId: mv.id },
  };
}

async function applySale(
  device: Device,
  cmd: SyncCommandDto,
): Promise<CommandOutcome> {
  const p = SalePayloadSchema.safeParse(cmd.payload);
  if (!p.success) return { ok: false, error: "Comando SALE inválido" };

  const r = await applySaleCommand(
    device,
    {
      clientSaleId: cmd.clientId,
      occurredAtDevice: new Date(cmd.occurredAtDevice),
      sessionId: p.data.sessionId,
      lines: p.data.lines,
      globalDiscountPercent: p.data.globalDiscountPercent,
      payments: p.data.payments,
      tenderedBob: p.data.tenderedBob,
      orderId: p.data.orderId,
      authorizedByOperatorId: p.data.authorizedByOperatorId ?? null,
    },
    { seq: cmd.seq },
  );
  if (!r.ok) return { ok: false, error: r.error };
  return {
    ok: true,
    ack: {
      clientId: cmd.clientId,
      seq: cmd.seq,
      folio: r.folio,
      serverId: r.saleId,
    },
    negativeVariantIds: r.negativeVariantIds,
  };
}

/** Aplica un comando según su tipo. El llamador garantiza el orden por `seq`. */
export async function applyCommand(
  device: Device,
  cmd: SyncCommandDto,
): Promise<CommandOutcome> {
  const fallbackOperator = await prisma.cashSession.findFirst({
    where: { deviceId: device.id, closedAt: null },
    select: { operatorId: true },
  });
  const operatorId = fallbackOperator?.operatorId ?? "";
  switch (cmd.kind) {
    case "SALE":
      return applySale(device, cmd);
    case "VOID":
      return applyVoid(cmd, operatorId);
    case "CASH_MOVEMENT":
      return applyCashMovement(cmd);
    default:
      return { ok: false, error: "Tipo de comando desconocido" };
  }
}
