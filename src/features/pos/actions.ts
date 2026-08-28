"use server";
// Glass — operaciones del POS (§16). Autorización por token de dispositivo + PIN
// de operador; nada de Supabase. La venta cobrada nunca se rechaza por stock.
import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { applySaleCommand } from "./apply-sale";
import { newDeviceToken, requireDevice } from "./device";
import { requireAuthPin, verifyOperatorPin } from "./pin";
import {
  findOrderForPos,
  getPosBootstrap,
  getSessionSummary,
  lookupPosVariant,
  type PosOrderLookup,
  type PosProduct,
  searchPosProducts,
} from "./queries";
import { getReceipt, type ReceiptView } from "./receipt";
import {
  CashMovementSchema,
  CloseShiftSchema,
  CreateSaleSchema,
  OpenShiftSchema,
  PairDeviceSchema,
  VoidSaleSchema,
} from "./schemas";
import { computeSessionArqueo } from "./summary";
import type { PosBootstrap, SessionSummary } from "./types";

export interface PosResult {
  ok: boolean;
  error?: string;
  lockedSeconds?: number;
}

const SUPER_ROLES = ["PROPIETARIO", "ADMINISTRADOR"] as const;

async function audit(
  action: string,
  entity: string,
  entityId: string,
  operatorId: string | null,
  data?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      actorType: "operator",
      actorId: operatorId,
      after: data,
    },
  });
}

// ---------------------------------------------------------------------------
// Emparejamiento del dispositivo (§6.2)
// ---------------------------------------------------------------------------

export async function pairDeviceAction(
  raw: unknown,
): Promise<PosResult & { token?: string; deviceId?: string; name?: string }> {
  const parsed = PairDeviceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { code, name } = parsed.data;
  const pairing = await prisma.devicePairingCode.findUnique({
    where: { code },
  });
  if (!pairing || pairing.usedAt || pairing.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Código inválido o vencido" };
  }

  const token = newDeviceToken();
  const device = await prisma.device.create({ data: { name, token } });

  // Los códigos de vida corta (el flujo real del panel) se consumen; el código
  // de demo de larga duración se deja disponible.
  const shortLived = pairing.expiresAt.getTime() - Date.now() < 24 * 3_600_000;
  if (shortLived) {
    await prisma.devicePairingCode.update({
      where: { id: pairing.id },
      data: { usedAt: new Date() },
    });
  }
  await audit("device.pair", "device", device.id, null, { name });
  return { ok: true, token, deviceId: device.id, name: device.name };
}

// ---------------------------------------------------------------------------
// Turno (§16.2)
// ---------------------------------------------------------------------------

export async function openShiftAction(
  token: string,
  raw: unknown,
): Promise<PosResult & { sessionId?: string; operatorName?: string }> {
  const device = await requireDevice(token);
  const parsed = OpenShiftSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { operatorId, pin, openingBs } = parsed.data;

  const existing = await prisma.cashSession.findFirst({
    where: { deviceId: device.id, closedAt: null },
    include: { operator: { select: { name: true } } },
  });
  if (existing) {
    return {
      ok: true,
      sessionId: existing.id,
      operatorName: existing.operator.name,
    };
  }

  const pinResult = await verifyOperatorPin(operatorId, pin);
  if (!pinResult.ok || !pinResult.operator) {
    return {
      ok: false,
      error: pinResult.error,
      lockedSeconds: pinResult.lockedSeconds,
    };
  }

  const session = await prisma.cashSession.create({
    data: {
      operatorId,
      deviceId: device.id,
      openedAt: new Date(),
      openingBob: openingBs,
    },
  });
  await audit("shift.open", "cash_session", session.id, operatorId, {
    openingBob: openingBs,
  });
  return {
    ok: true,
    sessionId: session.id,
    operatorName: pinResult.operator.name,
  };
}

export async function closeShiftAction(
  token: string,
  raw: unknown,
): Promise<
  PosResult & {
    expectedBob?: number;
    differenceBob?: number;
    needsNote?: boolean;
  }
> {
  await requireDevice(token);
  const parsed = CloseShiftSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { sessionId, countedBs, note } = parsed.data;
  const settings = await getSiteSettings();

  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return { ok: false, error: "Turno no encontrado" };
  if (session.closedAt) return { ok: false, error: "El turno ya está cerrado" };

  const arqueo = await computeSessionArqueo(sessionId, countedBs);
  if (
    Math.abs(arqueo.differenceBob) > settings.cashDifferenceThresholdBob &&
    !note
  ) {
    return {
      ok: false,
      needsNote: true,
      expectedBob: arqueo.expectedBob,
      differenceBob: arqueo.differenceBob,
      error: "La diferencia supera el umbral: escribí una nota.",
    };
  }

  await prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      closedAt: new Date(),
      countedBob: countedBs,
      expectedBob: arqueo.expectedBob,
      differenceBob: arqueo.differenceBob,
      note: note || null,
    },
  });
  await audit("shift.close", "cash_session", sessionId, session.operatorId, {
    countedBob: countedBs,
    differenceBob: arqueo.differenceBob,
  });
  return {
    ok: true,
    expectedBob: arqueo.expectedBob,
    differenceBob: arqueo.differenceBob,
  };
}

// ---------------------------------------------------------------------------
// Venta (§16.1, §13.1) — idempotente sobre clientSaleId (§17.2 regla 1-2)
// ---------------------------------------------------------------------------

export async function createSaleAction(
  token: string,
  raw: unknown,
): Promise<
  PosResult & { folio?: string; saleId?: string; changeBob?: number }
> {
  const device = await requireDevice(token);
  const parsed = CreateSaleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const input = parsed.data;

  const r = await applySaleCommand(device, {
    clientSaleId: input.clientSaleId,
    occurredAtDevice: input.occurredAtDevice,
    sessionId: input.sessionId,
    lines: input.lines.map((l) => ({
      variantId: l.variantId,
      qty: l.qty,
      discountPercent: l.discountPercent,
    })),
    globalDiscountPercent: input.globalDiscountPercent,
    payments: input.payments,
    tenderedBob: input.tenderedBob,
    orderId: input.orderId,
    authPin: input.authPin,
  });
  if (!r.ok) return { ok: false, error: r.error };

  if (!r.duplicate) {
    await audit("sale.create", "sale", r.saleId, null, {
      folio: r.folio,
      totalBob: r.totalBob,
      orderId: input.orderId ?? null,
    });
    revalidateTag("catalog", "max");
  }

  return { ok: true, saleId: r.saleId, folio: r.folio, changeBob: r.changeBob };
}

/**
 * Verifica un PIN de rol superior (§6.4) cuando el paquete aún no cargó los
 * hashes en la tablet. Con el paquete presente, la autorización es local.
 */
export async function verifyAuthPinAction(
  token: string,
  pin: string,
): Promise<PosResult & { operatorId?: string }> {
  await requireDevice(token);
  try {
    const op = await requireAuthPin(pin, [...SUPER_ROLES]);
    return { ok: true, operatorId: op.id };
  } catch {
    return { ok: false, error: "PIN de un rol superior inválido" };
  }
}

// ---------------------------------------------------------------------------
// Anulación (§16.3, §6.4) y movimientos de efectivo
// ---------------------------------------------------------------------------

export async function voidSaleAction(
  token: string,
  raw: unknown,
): Promise<PosResult> {
  await requireDevice(token);
  const parsed = VoidSaleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { saleId, authPin, reason } = parsed.data;

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true, cashSession: { select: { closedAt: true } } },
  });
  if (!sale) return { ok: false, error: "Venta no encontrada" };
  if (sale.voidedAt) return { ok: false, error: "La venta ya está anulada" };
  if (sale.cashSession.closedAt) {
    return {
      ok: false,
      error: "El turno de esa venta ya cerró; usá una devolución",
    };
  }

  const authorizer = await requireAuthPin(authPin, [...SUPER_ROLES]);

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: {
        voidedAt: new Date(),
        voidReason: reason,
        authorizedByOperatorId: authorizer.id,
      },
    });
    await tx.stockMovement.createMany({
      data: sale.items.map((it) => ({
        variantId: it.variantId,
        kind: "DEVOLUCION" as const,
        qty: it.qty,
        occurredAt: new Date(),
        sourceType: "sale",
        sourceId: sale.id,
        operatorId: authorizer.id,
      })),
    });
  });
  await audit("sale.void", "sale", saleId, authorizer.id, { reason });
  revalidateTag("catalog", "max");
  return { ok: true };
}

export async function cashMovementAction(
  token: string,
  raw: unknown,
): Promise<PosResult> {
  await requireDevice(token);
  const parsed = CashMovementSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { sessionId, kind, amountBs, reason, authPin } = parsed.data;

  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.closedAt) {
    return { ok: false, error: "Turno cerrado" };
  }

  let actorId = session.operatorId;
  if (kind !== "INGRESO") {
    if (!authPin)
      return {
        ok: false,
        error: "Sacar dinero necesita PIN de un rol superior",
      };
    actorId = (await requireAuthPin(authPin, [...SUPER_ROLES])).id;
    if (!reason) return { ok: false, error: "Motivo obligatorio" };
  }

  const mv = await prisma.cashMovement.create({
    data: {
      cashSessionId: sessionId,
      kind,
      amountBob: amountBs,
      reason: reason || null,
      operatorId: actorId,
    },
  });
  await audit("cash.movement", "cash_movement", mv.id, actorId, {
    kind,
    amountBob: amountBs,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Verificación de PIN suelta (re-pedido por inactividad, §6.2)
// ---------------------------------------------------------------------------

export async function verifyPinAction(
  token: string,
  operatorId: string,
  pin: string,
): Promise<PosResult> {
  await requireDevice(token);
  const r = await verifyOperatorPin(operatorId, pin);
  return { ok: r.ok, error: r.error, lockedSeconds: r.lockedSeconds };
}

// ---------------------------------------------------------------------------
// Lecturas expuestas como actions (los componentes cliente no importan queries)
// ---------------------------------------------------------------------------

export async function posBootstrapAction(
  token: string,
): Promise<{ ok: boolean; error?: string; data?: PosBootstrap }> {
  try {
    return { ok: true, data: await getPosBootstrap(token) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function posSearchAction(
  token: string,
  q: string,
  categoryId?: string,
): Promise<PosProduct[]> {
  return searchPosProducts(token, q, categoryId);
}

export async function posLookupAction(
  token: string,
  code: string,
): Promise<PosProduct | null> {
  return lookupPosVariant(token, code);
}

export async function posFindOrderAction(
  token: string,
  folio: string,
): Promise<PosOrderLookup | null> {
  return findOrderForPos(token, folio);
}

export async function getSessionSummaryAction(
  token: string,
  sessionId: string,
): Promise<SessionSummary | null> {
  return getSessionSummary(token, sessionId);
}

export async function getReceiptAction(
  token: string,
  folio: string,
): Promise<ReceiptView | null> {
  return getReceipt(token, folio);
}
