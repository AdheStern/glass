import "server-only";
// Glass — consultas del tablero (§18.1) y de los 7 reportes (§18.2). Las cifras
// de venta salen de los agregados diarios; el resto reutiliza las consultas de
// inventario, caja y pedidos ya existentes.
import { prisma } from "@/db/client";
import { dateRange, type WowDelta, weekOverWeek } from "@/domain/reports";
import { getProductRows, getSalesRows } from "./rollup";

const PENDING_ORDER: ("NUEVO" | "CONFIRMADO" | "PREPARADO")[] = [
  "NUEVO",
  "CONFIRMADO",
  "PREPARADO",
];

/** Fecha "de negocio" en Bolivia, `YYYY-MM-DD`. */
export function businessToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface DashboardKpi {
  soldTodayBob: number;
  salesToday: number;
  pendingOrders: number;
  belowMin: number;
  soldWow: WowDelta;
  salesWow: WowDelta;
}

export interface DashboardData {
  kpi: DashboardKpi;
  curve: { day: string; netBob: number }[];
  topWeek: { name: string; qty: number; netBob: number }[];
  alerts: { negativeStock: number; quarantined: number; staleOrders: number };
}

export async function getDashboard(): Promise<DashboardData> {
  const today = businessToday();
  const from = new Date(`${shiftIso(today, -14)}T00:00:00Z`);
  const to = new Date(`${today}T00:00:00Z`);

  const [
    salesRows,
    productRows,
    pendingOrders,
    belowMin,
    negativeStock,
    quarantined,
    staleOrders,
  ] = await Promise.all([
    getSalesRows(from, to),
    getProductRows(new Date(`${shiftIso(today, -7)}T00:00:00Z`), to),
    prisma.order.count({ where: { status: { in: PENDING_ORDER } } }),
    prisma.$queryRaw<
      { n: bigint }[]
    >`SELECT count(*) n FROM variant_stock_alert WHERE below_min`,
    prisma.$queryRaw<
      { n: bigint }[]
    >`SELECT count(*) n FROM variant_stock_alert WHERE negative`,
    prisma.syncCommand.count({ where: { status: "QUARANTINED" } }),
    prisma.order.count({
      where: {
        status: { in: PENDING_ORDER },
        statusChangedAt: { lt: new Date(Date.now() - 24 * 3600_000) },
      },
    }),
  ]);

  const byDay = new Map<string, { net: number; count: number }>();
  for (const r of salesRows) {
    const cur = byDay.get(r.day) ?? { net: 0, count: 0 };
    cur.net += r.netBob;
    cur.count += r.salesCount;
    byDay.set(r.day, cur);
  }
  const dayBefore = shiftIso(today, -7);
  const curve = dateRange(from, to).map((day) => ({
    day,
    netBob: byDay.get(day)?.net ?? 0,
  }));

  const topAgg = new Map<string, { qty: number; net: number }>();
  for (const r of productRows) {
    const cur = topAgg.get(r.variantId) ?? { qty: 0, net: 0 };
    cur.qty += r.qty;
    cur.net += r.netBob;
    topAgg.set(r.variantId, cur);
  }
  const topIds = [...topAgg.entries()]
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([id]) => id);
  const variants = topIds.length
    ? await prisma.variant.findMany({
        where: { id: { in: topIds } },
        select: { id: true, product: { select: { name: true } } },
      })
    : [];
  const nameOf = new Map(variants.map((v) => [v.id, v.product.name]));
  const topWeek = topIds.map((id) => ({
    name: nameOf.get(id) ?? "—",
    qty: topAgg.get(id)?.qty ?? 0,
    netBob: topAgg.get(id)?.net ?? 0,
  }));

  return {
    kpi: {
      soldTodayBob: byDay.get(today)?.net ?? 0,
      salesToday: byDay.get(today)?.count ?? 0,
      pendingOrders,
      belowMin: Number(belowMin[0]?.n ?? 0),
      soldWow: weekOverWeek(
        byDay.get(today)?.net ?? 0,
        byDay.get(dayBefore)?.net ?? 0,
      ),
      salesWow: weekOverWeek(
        byDay.get(today)?.count ?? 0,
        byDay.get(dayBefore)?.count ?? 0,
      ),
    },
    curve,
    topWeek,
    alerts: {
      negativeStock: Number(negativeStock[0]?.n ?? 0),
      quarantined,
      staleOrders,
    },
  };
}
