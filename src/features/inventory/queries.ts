import "server-only";
import { prisma } from "@/db/client";
import {
  type CountAdjustment,
  dormantCapital,
  reorderList,
  stockCountDiff,
} from "@/domain/inventory";

const PAGE = 50;

// ---------------------------------------------------------------------------
// Libro de movimientos (§14.1)
// ---------------------------------------------------------------------------

export interface LedgerRow {
  id: string;
  occurredAt: Date;
  kind: string;
  qty: number;
  sourceType: string;
  sourceId: string | null;
  note: string | null;
  variantId: string;
  variantLabel: string;
  productSlug: string;
}

export interface LedgerFilter {
  variantId?: string;
  kind?: string;
  sourceType?: string;
  page?: number;
}

export async function getMovementLedger(
  f: LedgerFilter = {},
): Promise<{ rows: LedgerRow[]; page: number; hasMore: boolean }> {
  const page = Math.max(1, f.page ?? 1);
  const where = {
    ...(f.variantId ? { variantId: f.variantId } : {}),
    ...(f.kind ? { kind: f.kind as never } : {}),
    ...(f.sourceType ? { sourceType: f.sourceType } : {}),
  };
  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: PAGE + 1,
    skip: (page - 1) * PAGE,
    include: {
      variant: {
        select: {
          attributes: true,
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });
  const hasMore = movements.length > PAGE;
  const rows = movements.slice(0, PAGE).map((m) => {
    const variante = (m.variant.attributes as { variante?: string } | null)
      ?.variante;
    return {
      id: m.id,
      occurredAt: m.occurredAt,
      kind: m.kind,
      qty: m.qty,
      sourceType: m.sourceType,
      sourceId: m.sourceId,
      note: m.note,
      variantId: m.variantId,
      variantLabel: variante
        ? `${m.variant.product.name} — ${variante}`
        : m.variant.product.name,
      productSlug: m.variant.product.slug,
    };
  });
  return { rows, page, hasMore };
}

// ---------------------------------------------------------------------------
// Alertas (§14.4) — de la vista variant_stock_alert
// ---------------------------------------------------------------------------

interface AlertRow {
  variant_id: string;
  product_name: string;
  product_slug: string;
  sku: string | null;
  barcode: string | null;
  min_stock: number;
  cost_bob: number | null;
  on_hand: number;
  last_movement_at: Date | null;
  below_min: boolean;
  negative: boolean;
  no_barcode: boolean;
}

export interface InventoryAlerts {
  belowMin: AlertRow[];
  negative: AlertRow[];
  noBarcode: AlertRow[];
  counts: { belowMin: number; negative: number; noBarcode: number };
}

export async function getInventoryAlerts(): Promise<InventoryAlerts> {
  const rows = await prisma.$queryRaw<AlertRow[]>`
    SELECT variant_id, product_name, product_slug, sku, barcode,
           min_stock, cost_bob, on_hand, last_movement_at,
           below_min, negative, no_barcode
    FROM variant_stock_alert
    WHERE below_min OR negative OR no_barcode
    ORDER BY on_hand ASC
  `;
  const belowMin = rows.filter((r) => r.below_min && !r.negative);
  const negative = rows.filter((r) => r.negative);
  const noBarcode = rows.filter((r) => r.no_barcode);
  return {
    belowMin: belowMin.slice(0, 100),
    negative: negative.slice(0, 100),
    noBarcode: noBarcode.slice(0, 100),
    counts: {
      belowMin: belowMin.length,
      negative: negative.length,
      noBarcode: noBarcode.length,
    },
  };
}

export interface ReorderRow {
  variantId: string;
  productName: string;
  sku: string | null;
  qty: number;
  minStock: number;
  suggestedQty: number;
}

export async function getReorderList(): Promise<ReorderRow[]> {
  const rows = await prisma.$queryRaw<
    {
      variant_id: string;
      product_name: string;
      sku: string | null;
      on_hand: number;
      min_stock: number;
    }[]
  >`
    SELECT variant_id, product_name, sku, on_hand, min_stock
    FROM variant_stock_alert
    WHERE below_min
  `;
  const suggestions = reorderList(
    rows.map((r) => ({
      variantId: r.variant_id,
      qty: r.on_hand,
      minStock: r.min_stock,
    })),
  );
  const byId = new Map(rows.map((r) => [r.variant_id, r]));
  return suggestions.map((s) => ({
    variantId: s.variantId,
    productName: byId.get(s.variantId)?.product_name ?? "",
    sku: byId.get(s.variantId)?.sku ?? null,
    qty: s.qty,
    minStock: s.minStock,
    suggestedQty: s.suggestedQty,
  }));
}

export interface DormantRow {
  variantId: string;
  productName: string;
  qty: number;
  frozenBob: number;
  idleDays: number | null;
}

export async function getDormantReport(
  now = new Date(),
): Promise<DormantRow[]> {
  const rows = await prisma.$queryRaw<
    {
      variant_id: string;
      product_name: string;
      on_hand: number;
      cost_bob: number | null;
      last_movement_at: Date | null;
    }[]
  >`
    SELECT variant_id, product_name, on_hand, cost_bob, last_movement_at
    FROM variant_stock_alert
    WHERE on_hand > 0
  `;
  return dormantCapital(
    rows.map((r) => ({
      variantId: r.variant_id,
      qty: r.on_hand,
      costBob: r.cost_bob ?? 0,
      lastMovementAt: r.last_movement_at,
    })),
    now,
  )
    .slice(0, 100)
    .map((d) => {
      const src = rows.find((r) => r.variant_id === d.variantId);
      return {
        variantId: d.variantId,
        productName: src?.product_name ?? "",
        qty: d.qty,
        frozenBob: d.frozenBob,
        idleDays: d.idleDays,
      };
    });
}

// ---------------------------------------------------------------------------
// Escaneo → variante
// ---------------------------------------------------------------------------

export interface ScannedVariant {
  variantId: string;
  productName: string;
  slug: string;
  variantLabel: string | null;
  basePriceBob: number;
  costBob: number | null;
  onHand: number;
}

export async function findVariantByBarcode(
  code: string,
): Promise<ScannedVariant | null> {
  const clean = code.trim();
  if (!clean) return null;
  const v = await prisma.variant.findFirst({
    where: { OR: [{ barcode: clean }, { sku: clean }], archivedAt: null },
    include: {
      product: { select: { name: true, slug: true } },
      stock: { select: { qty: true } },
    },
  });
  if (!v) return null;
  return {
    variantId: v.id,
    productName: v.product.name,
    slug: v.product.slug,
    variantLabel:
      (v.attributes as { variante?: string } | null)?.variante ?? null,
    basePriceBob: v.basePriceBob,
    costBob: v.costBob,
    onHand: v.stock?.qty ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Tomas de inventario (§14.3)
// ---------------------------------------------------------------------------

export async function listStockCounts() {
  return prisma.stockCount.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      category: { select: { name: true } },
      _count: { select: { lines: true } },
    },
  });
}

export interface StockCountDetail {
  id: string;
  status: string;
  scope: string;
  note: string | null;
  categoryName: string | null;
  frozenAt: Date;
  lines: {
    variantId: string;
    label: string;
    theoreticalQty: number;
    countedQty: number | null;
    unitCostBob: number | null;
  }[];
  diff: CountAdjustment[];
  diffLabels: Record<string, string>;
}

export async function getStockCount(
  id: string,
): Promise<StockCountDetail | null> {
  const c = await prisma.stockCount.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      lines: {
        include: {
          variant: {
            select: {
              attributes: true,
              product: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!c) return null;

  const labelOf = (l: (typeof c.lines)[number]) => {
    const variante = (l.variant.attributes as { variante?: string } | null)
      ?.variante;
    return variante
      ? `${l.variant.product.name} — ${variante}`
      : l.variant.product.name;
  };

  const lines = c.lines
    .map((l) => ({
      variantId: l.variantId,
      label: labelOf(l),
      theoreticalQty: l.theoreticalQty,
      countedQty: l.countedQty,
      unitCostBob: l.unitCostBob,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const diff = stockCountDiff(
    c.lines.map((l) => ({
      variantId: l.variantId,
      theoreticalQty: l.theoreticalQty,
      countedQty: l.countedQty,
      unitCostBob: l.unitCostBob ?? 0,
    })),
  );
  const diffLabels: Record<string, string> = {};
  for (const l of c.lines) diffLabels[l.variantId] = labelOf(l);

  return {
    id: c.id,
    status: c.status,
    scope: c.scope,
    note: c.note,
    categoryName: c.category?.name ?? null,
    frozenAt: c.frozenAt,
    lines,
    diff,
    diffLabels,
  };
}
