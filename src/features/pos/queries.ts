import "server-only";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { computeArqueo } from "@/domain/arqueo";
import {
  type DiscountInput,
  resolveBestPrice,
} from "@/features/catalog/discount";
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

  // Una sola consulta con todo lo que hace falta para el precio (evita 3 idas y
  // vueltas contra la BD remota, que en la caja se notan).
  const [variants, discounts] = await Promise.all([
    prisma.variant.findMany({
      where: {
        archivedAt: null,
        product: {
          isActive: true,
          archivedAt: null,
          // La categoría puede ser una marca (padre): incluye sus subcategorías.
          ...(categoryId
            ? {
                categories: {
                  some: {
                    category: {
                      OR: [{ id: categoryId }, { parentId: categoryId }],
                    },
                  },
                },
              }
            : {}),
        },
        ...(term
          ? {
              OR: [
                {
                  product: {
                    name: { contains: term, mode: "insensitive" as const },
                  },
                },
                { barcode: term },
                { sku: term },
              ],
            }
          : {}),
      },
      take: 200,
      orderBy: { product: { name: "asc" } },
      select: {
        id: true,
        basePriceBob: true,
        attributes: true,
        barcode: true,
        product: {
          select: {
            id: true,
            name: true,
            categories: { select: { categoryId: true } },
          },
        },
        stock: { select: { qty: true } },
      },
    }),
    prisma.$queryRaw<
      {
        product_id: string | null;
        category_id: string | null;
        scope: string;
        percent: number | null;
        amount_bob: number | null;
      }[]
    >`
      select dp."B" as product_id, d.category_id, d.scope, d.percent, d.amount_bob
      from discount d
      left join "_DiscountToProduct" dp on dp."A" = d.id
      where d.is_active = true and d.archived_at is null
        and (d.starts_at is null or d.starts_at <= now())
        and (d.ends_at is null or d.ends_at >= now())`,
  ]);

  // El código exacto va primero.
  variants.sort((a, b) => {
    const ae = a.barcode === term || false;
    const be = b.barcode === term || false;
    return ae === be ? 0 : ae ? -1 : 1;
  });

  return variants.map((v) => {
    const catIds = new Set(v.product.categories.map((c) => c.categoryId));
    const applicable: DiscountInput[] = discounts
      .filter(
        (d) =>
          d.scope === "GLOBAL" ||
          (d.scope === "PRODUCT" && d.product_id === v.product.id) ||
          (d.scope === "CATEGORY" &&
            d.category_id &&
            catIds.has(d.category_id)),
      )
      .map((d) => ({ percent: d.percent, amountBob: d.amount_bob }));
    const best = resolveBestPrice(v.basePriceBob, applicable);
    const attrs = (v.attributes as Record<string, string> | null) ?? null;
    return {
      variantId: v.id,
      productName: v.product.name,
      variantLabel: attrs?.variante ?? null,
      basePriceBob: v.basePriceBob,
      effectiveBob: best.effectiveBob,
      stockQty: v.stock?.qty ?? 0,
    };
  });
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
