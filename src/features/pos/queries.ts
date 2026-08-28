import "server-only";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { computeArqueo } from "@/domain/arqueo";
import {
  getVariantPricing,
  type VariantPricing,
} from "@/features/orders/pricing";
import { requireDevice } from "./device";
import type {
  PosBootstrap,
  PosOrderLookup,
  PosProduct,
  SessionSummary,
} from "./types";

export type {
  PosBootstrap,
  PosOrderItem,
  PosOrderLookup,
  PosProduct,
  SessionSummary,
} from "./types";

function toPosProduct(p: VariantPricing): PosProduct {
  return {
    variantId: p.variantId,
    productName: p.productName,
    variantLabel: p.variantLabel,
    basePriceBob: p.basePriceBob,
    effectiveBob: p.effectiveBob,
    stockQty: p.stockQty,
  };
}

export async function getPosBootstrap(token: string): Promise<PosBootstrap> {
  const device = await requireDevice(token);
  const [operators, paymentMethods, categories, session, settings, top] =
    await Promise.all([
      prisma.operator.findMany({
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      }),
      prisma.paymentMethod.findMany({
        where: { archivedAt: null },
        orderBy: { position: "asc" },
        select: { id: true, label: true, countsInDrawer: true },
      }),
      prisma.category.findMany({
        where: { archivedAt: null, parentId: null },
        orderBy: { position: "asc" },
        select: { id: true, name: true },
      }),
      prisma.cashSession.findFirst({
        where: { deviceId: device.id, closedAt: null },
        include: { operator: { select: { name: true } } },
      }),
      getSiteSettings(),
      topSellerVariantIds(24),
    ]);

  const pricing = await getVariantPricing(top);
  const topSellers = top
    .map((id) => pricing.get(id))
    .filter((p): p is VariantPricing => !!p)
    .map(toPosProduct);

  return {
    device: { id: device.id, name: device.name },
    operators,
    paymentMethods,
    categories,
    openSession: session
      ? {
          id: session.id,
          operatorId: session.operatorId,
          operatorName: session.operator.name,
          openedAt: session.openedAt,
          openingBob: session.openingBob,
        }
      : null,
    settings: {
      name: settings.name,
      roundingMode: settings.roundingMode,
      maxCashierDiscountPercent: settings.maxCashierDiscountPercent,
      cashDifferenceThresholdBob: settings.cashDifferenceThresholdBob,
    },
    topSellers,
  };
}

async function topSellerVariantIds(limit: number): Promise<string[]> {
  const rows = await prisma.saleItem.groupBy({
    by: ["variantId"],
    _sum: { qty: true },
    orderBy: { _sum: { qty: "desc" } },
    take: limit,
  });
  if (rows.length >= limit) return rows.map((r) => r.variantId);

  // Respaldo: completa con variantes activas cualesquiera.
  const seen = new Set(rows.map((r) => r.variantId));
  const fill = await prisma.variant.findMany({
    where: { archivedAt: null, product: { isActive: true, archivedAt: null } },
    orderBy: { id: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const v of fill) {
    if (seen.size >= limit) break;
    seen.add(v.id);
  }
  return [...seen].slice(0, limit);
}

export async function searchPosProducts(
  token: string,
  q: string,
  categoryId?: string,
): Promise<PosProduct[]> {
  await requireDevice(token);
  const term = q.trim();
  const variants = await prisma.variant.findMany({
    where: {
      archivedAt: null,
      product: {
        isActive: true,
        archivedAt: null,
        ...(categoryId ? { categories: { some: { categoryId } } } : {}),
        ...(term
          ? { name: { contains: term, mode: "insensitive" as const } }
          : {}),
      },
    },
    take: 60,
    select: { id: true },
  });
  // Búsqueda directa por código también.
  if (term) {
    const byCode = await prisma.variant.findFirst({
      where: { OR: [{ barcode: term }, { sku: term }], archivedAt: null },
      select: { id: true },
    });
    if (byCode && !variants.some((v) => v.id === byCode.id)) {
      variants.unshift(byCode);
    }
  }
  const pricing = await getVariantPricing(variants.map((v) => v.id));
  return [...pricing.values()].map(toPosProduct);
}

export async function lookupPosVariant(
  token: string,
  code: string,
): Promise<PosProduct | null> {
  await requireDevice(token);
  const v = await prisma.variant.findFirst({
    where: {
      OR: [{ barcode: code.trim() }, { sku: code.trim() }],
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!v) return null;
  const pricing = await getVariantPricing([v.id]);
  const p = pricing.get(v.id);
  return p ? toPosProduct(p) : null;
}

export async function findOrderForPos(
  token: string,
  folio: string,
): Promise<PosOrderLookup | null> {
  await requireDevice(token);
  const order = await prisma.order.findUnique({
    where: { folio: folio.trim().toUpperCase() },
    include: {
      items: {
        include: {
          variant: { select: { product: { select: { name: true } } } },
        },
      },
    },
  });
  if (!order) return null;
  if (order.saleId)
    return { id: order.id, folio: order.folio, status: "COBRADO", items: [] };

  // Precio actual (§13.2 "sin conexión y con precios cambiados"): el POS cobra al
  // precio vigente, no al congelado en el pedido.
  const pricing = await getVariantPricing(
    order.items.map((it) => it.variantId),
  );
  return {
    id: order.id,
    folio: order.folio,
    status: order.status,
    items: order.items.map((it) => {
      const p = pricing.get(it.variantId);
      return {
        variantId: it.variantId,
        productName:
          p?.productName || it.nameSnapshot || it.variant.product.name,
        variantLabel: p?.variantLabel ?? null,
        qty: it.qty,
        basePriceBob: p?.basePriceBob ?? it.listPriceBob,
        effectiveBob: p?.effectiveBob ?? it.unitPriceBob,
      };
    }),
  };
}

export async function getSessionSummary(
  token: string,
  sessionId: string,
): Promise<SessionSummary | null> {
  await requireDevice(token);
  const s = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: {
      operator: { select: { name: true } },
      sales: { include: { payments: { include: { method: true } } } },
      cashMovements: true,
    },
  });
  if (!s) return null;

  const methodTotals = new Map<
    string,
    { label: string; countsInDrawer: boolean; totalBob: number }
  >();
  let cashSalesBob = 0;
  let voided = 0;
  for (const sale of s.sales) {
    if (sale.voidedAt) {
      voided++;
      continue;
    }
    for (const p of sale.payments) {
      const cur = methodTotals.get(p.methodId) ?? {
        label: p.method.label,
        countsInDrawer: p.method.countsInDrawer,
        totalBob: 0,
      };
      cur.totalBob += p.amountBob;
      methodTotals.set(p.methodId, cur);
      if (p.method.countsInDrawer) cashSalesBob += p.amountBob;
    }
  }

  let ins = 0;
  let outs = 0;
  for (const m of s.cashMovements) {
    if (m.kind === "INGRESO") ins += m.amountBob;
    else outs += m.amountBob;
  }

  const { expectedBob } = computeArqueo({
    openingBob: s.openingBob,
    cashSalesBob,
    cashInsBob: ins,
    cashOutsBob: outs,
    countedBob: s.countedBob ?? 0,
  });

  return {
    id: s.id,
    operatorName: s.operator.name,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    openingBob: s.openingBob,
    countedBob: s.countedBob,
    expectedBob: s.closedAt ? (s.expectedBob ?? expectedBob) : expectedBob,
    differenceBob: s.closedAt ? s.differenceBob : null,
    saleCount: s.sales.filter((x) => !x.voidedAt).length,
    voidedCount: voided,
    byMethod: [...methodTotals.values()],
    movements: s.cashMovements.map((m) => ({
      kind: m.kind,
      amountBob: m.amountBob,
      reason: m.reason,
      occurredAt: m.occurredAt,
    })),
  };
}
