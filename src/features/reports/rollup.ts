import "server-only";
// Glass — lectura de los agregados diarios (§18.3). El trabajo nocturno
// (`/api/cron/rollup`) rehace el grueso; aquí, antes de leer, se refrescan los
// últimos días para incorporar el día en curso y las sincronizaciones offline
// tardías. Es barato (3 días) y deja las consultas de reporte leyendo solo tabla.
import { prisma } from "@/db/client";

let lastRefresh = 0;
const REFRESH_TTL_MS = 60_000;

/** Refresca hoy y los 2 días previos. Se auto-limita a una vez por minuto. */
export async function ensureFreshRollup(): Promise<void> {
  const now = Date.now();
  if (now - lastRefresh < REFRESH_TTL_MS) return;
  lastRefresh = now;
  await prisma.$executeRawUnsafe(
    "SELECT glass_refresh_rollup(current_date - 2, current_date)",
  );
}

export interface SalesDayRow {
  day: string; // YYYY-MM-DD
  operatorId: string;
  channel: string; // MOSTRADOR | PEDIDO
  salesCount: number;
  grossBob: number;
  discountBob: number;
  roundingBob: number;
  netBob: number;
  cogsBob: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function getSalesRows(
  from: Date,
  to: Date,
): Promise<SalesDayRow[]> {
  await ensureFreshRollup();
  const rows = await prisma.dailySalesRollup.findMany({
    where: { day: { gte: new Date(iso(from)), lte: new Date(iso(to)) } },
    orderBy: { day: "asc" },
  });
  return rows.map((r) => ({
    day: iso(r.day),
    operatorId: r.operatorId,
    channel: r.channel,
    salesCount: r.salesCount,
    grossBob: r.grossBob,
    discountBob: r.discountBob,
    roundingBob: r.roundingBob,
    netBob: r.netBob,
    cogsBob: r.cogsBob,
  }));
}

export interface ProductDayRow {
  day: string;
  variantId: string;
  qty: number;
  netBob: number;
  cogsBob: number;
}

export async function getProductRows(
  from: Date,
  to: Date,
): Promise<ProductDayRow[]> {
  await ensureFreshRollup();
  const rows = await prisma.dailyProductRollup.findMany({
    where: { day: { gte: new Date(iso(from)), lte: new Date(iso(to)) } },
  });
  return rows.map((r) => ({
    day: iso(r.day),
    variantId: r.variantId,
    qty: r.qty,
    netBob: r.netBob,
    cogsBob: r.cogsBob,
  }));
}

export interface PaymentDayRow {
  day: string;
  paymentMethodId: string;
  amountBob: number;
  paymentCount: number;
}

export async function getPaymentRows(
  from: Date,
  to: Date,
): Promise<PaymentDayRow[]> {
  await ensureFreshRollup();
  const rows = await prisma.dailyPaymentRollup.findMany({
    where: { day: { gte: new Date(iso(from)), lte: new Date(iso(to)) } },
  });
  return rows.map((r) => ({
    day: iso(r.day),
    paymentMethodId: r.paymentMethodId,
    amountBob: r.amountBob,
    paymentCount: r.paymentCount,
  }));
}
