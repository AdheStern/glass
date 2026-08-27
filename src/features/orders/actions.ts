"use server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { roundToStep } from "@/domain/money";
import { requireRole } from "@/features/auth/roles";
import { nextOrderFolio } from "./folio";
import { buildOrderMessage, waLink } from "./message";
import { getVariantPricing } from "./pricing";
import { type CreateOrderInput, CreateOrderSchema } from "./schemas";

const STEP: Record<string, number> = {
  NONE: 1,
  NEAREST_10: 10,
  NEAREST_50: 50,
};

export interface CreateOrderResult {
  ok: boolean;
  folio?: string;
  waUrl?: string;
  message?: string;
  warnings?: string[];
  error?: string;
}

export async function createOrderAction(
  raw: CreateOrderInput,
): Promise<CreateOrderResult> {
  const parsed = CreateOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const input = parsed.data;
  const settings = await getSiteSettings();

  const pricing = await getVariantPricing(input.items.map((i) => i.variantId));
  const warnings: string[] = [];

  const lines = input.items.map((item) => {
    const p = pricing.get(item.variantId);
    if (!p) return null;
    if (p.stockQty < item.qty) {
      warnings.push(
        `${p.productName}: quedan ${Math.max(0, p.stockQty)}, pediste ${item.qty}`,
      );
    }
    return {
      variantId: p.variantId,
      productSlug: p.slug,
      nameSnapshot: p.variantLabel
        ? `${p.productName} — ${p.variantLabel}`
        : p.productName,
      qty: item.qty,
      unitPriceBob: p.effectiveBob,
      listPriceBob: p.basePriceBob,
      discountBob: (p.basePriceBob - p.effectiveBob) * item.qty,
      note: item.note ?? null,
    };
  });

  if (lines.some((l) => l === null)) {
    return {
      ok: false,
      error: "Algún producto ya no está disponible. Actualizá el carrito.",
    };
  }
  const items = lines as NonNullable<(typeof lines)[number]>[];

  const subtotalBob = items.reduce((s, l) => s + l.unitPriceBob * l.qty, 0);
  const discountBob = items.reduce((s, l) => s + l.discountBob, 0);
  const totalBob = roundToStep(subtotalBob, STEP[settings.roundingMode] ?? 1);

  if (settings.minOrderBob && totalBob < settings.minOrderBob) {
    return {
      ok: false,
      error: settings.orderMessageTemplate?.includes("{minimo}")
        ? settings.orderMessageTemplate
        : `El pedido mínimo es Bs ${(settings.minOrderBob / 100).toFixed(2)}.`,
    };
  }

  const order = await prisma.$transaction(async (tx) => {
    const folio = await nextOrderFolio(tx);
    return tx.order.create({
      data: {
        folio,
        channel: "WHATSAPP",
        status: "NUEVO",
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        note: input.note || null,
        whatsappLabel: input.whatsappLabel || null,
        source: input.source || null,
        subtotalBob,
        discountBob,
        totalBob,
        items: { create: items },
      },
      include: { items: true },
    });
  });

  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const message = buildOrderMessage({
    siteName: settings.name,
    siteUrl,
    folio: order.folio,
    items: order.items.map((i) => ({
      qty: i.qty,
      nameSnapshot: i.nameSnapshot,
      unitPriceBob: i.unitPriceBob,
      listPriceBob: i.listPriceBob,
    })),
    totalBob: order.totalBob,
    customerName: order.customerName ?? undefined,
    note: order.note ?? undefined,
    template: settings.orderMessageTemplate,
  });

  const numbers = settings.whatsappNumbers;
  const chosen =
    numbers.find((n) => n.label === input.whatsappLabel) ?? numbers[0] ?? null;
  const waUrl = chosen ? waLink(chosen.e164, message) : undefined;

  return { ok: true, folio: order.folio, waUrl, message, warnings };
}

// ---------------------------------------------------------------------------
// Bandeja (§9.4)
// ---------------------------------------------------------------------------

const NEXT: Record<string, string> = {
  NUEVO: "CONFIRMADO",
  CONFIRMADO: "PREPARADO",
  PREPARADO: "ENTREGADO",
};

export async function advanceOrderAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireRole("PROPIETARIO", "ADMINISTRADOR", "CAJERO");
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { select: { variantId: true, qty: true } } },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  const next = NEXT[order.status];
  if (!next)
    return { ok: false, error: "El pedido ya está en su estado final" };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: next as never, statusChangedAt: new Date() },
    });

    // Solo ENTREGADO genera movimientos, y solo si no se cobró en caja (§5.2)
    if (next === "ENTREGADO" && !order.saleId) {
      await tx.stockMovement.createMany({
        data: order.items.map((it) => ({
          variantId: it.variantId,
          kind: "PEDIDO_ENTREGADO" as const,
          qty: -it.qty,
          occurredAt: new Date(),
          sourceType: "order",
          sourceId: id,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        action: "order.advance",
        entity: "order",
        entityId: id,
        actorType: "user",
        actorId: actor.id,
        before: { status: order.status },
        after: { status: next },
      },
    });
  });

  revalidateTag("catalog", "max");
  return { ok: true };
}

export async function cancelOrderAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireRole("PROPIETARIO", "ADMINISTRADOR", "CAJERO");
  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true, saleId: true },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.status === "ENTREGADO" || order.saleId) {
    return {
      ok: false,
      error: "No se puede cancelar un pedido ya entregado o cobrado",
    };
  }
  await prisma.order.update({
    where: { id },
    data: { status: "CANCELADO", statusChangedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      action: "order.cancel",
      entity: "order",
      entityId: id,
      actorType: "user",
      actorId: actor.id,
    },
  });
  return { ok: true };
}
