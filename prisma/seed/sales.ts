// Glass — 6 meses de ventas con estacionalidad, turnos de caja con diferencias
// y pedidos en todos los estados (§22.6). Los totales salen de src/domain (buildSale).
import type { PrismaClient } from "@prisma/client";
import { buildSale } from "../../src/domain/sale";
import type { SeededVariant } from "./catalog";
import type { SeededConfig } from "./config";
import { folio, idFactory, inBatches, type Rng } from "./lib";

const DAYS = 180;
const ANCHOR_END = Date.UTC(2026, 5, 30); // 30-jun-2026, fijo para determinismo

function fakeUuidV7(n: number): string {
  const h = n.toString(16).padStart(12, "0");
  return `018f8c1e-${h.slice(0, 4)}-7${h.slice(4, 7)}-8${h.slice(7, 10)}-${h.slice(0, 12).padEnd(12, "0")}`;
}

function salesForDay(dayIdx: number, date: Date, rng: Rng): number {
  const dow = date.getUTCDay();
  const weekend = dow === 6 ? 1.5 : dow === 0 ? 0.4 : 1;
  const trend = 1 + (dayIdx / DAYS) * 0.4;
  const december = date.getUTCMonth() === 11 ? 1.8 : 1;
  const mean = 14 * weekend * trend * december;
  return Math.max(0, Math.round(mean + (rng.float() - 0.5) * 6));
}

export interface SalesTotals {
  saleCount: number;
  orderCount: number;
  grandTotalBob: number;
}

export async function seedSales(
  prisma: PrismaClient,
  rng: Rng,
  cfg: SeededConfig,
  variants: SeededVariant[],
): Promise<SalesTotals> {
  const saleId = idFactory("sale");
  const saleItemId = idFactory("sitem");
  const paymentId = idFactory("pay");
  const movId = idFactory("smov");
  const sessionId = idFactory("cs");
  const cashMovId = idFactory("cm");

  const sales: Record<string, unknown>[] = [];
  const saleItems: Record<string, unknown>[] = [];
  const payments: Record<string, unknown>[] = [];
  const movements: Record<string, unknown>[] = [];
  const sessions: Record<string, unknown>[] = [];
  const cashMovements: Record<string, unknown>[] = [];

  const deviceSeq: Record<string, number> = {};
  let saleFolio = 0;
  let uuidN = 0;
  let grandTotalBob = 0;

  for (let d = 0; d < DAYS; d++) {
    const dayStart = new Date(ANCHOR_END - (DAYS - d) * 86_400_000);
    const dayCount = salesForDay(d, dayStart, rng);
    if (dayCount === 0) continue;

    const workingOps = rng.sample(cfg.operatorIds, rng.int(1, 2));
    const openSessions = workingOps.map((operatorId, k) => {
      const deviceId = cfg.deviceIds[k % cfg.deviceIds.length];
      const id = sessionId();
      const openedAt = new Date(dayStart.getTime() + 8 * 3_600_000);
      return {
        id,
        operatorId,
        deviceId,
        openedAt,
        cashInBob: 0,
        insBob: 0,
        outsBob: 0,
      };
    });

    for (let s = 0; s < dayCount; s++) {
      const session = rng.pick(openSessions);
      deviceSeq[session.deviceId] = (deviceSeq[session.deviceId] ?? 0) + 1;
      const occurredAt = new Date(
        session.openedAt.getTime() + rng.int(0, 8 * 3_600_000),
      );

      const lines = rng.sample(variants, rng.int(1, 4)).map((v) => ({
        variantId: v.id,
        qty: rng.int(1, 3),
        baseUnitPriceBob: v.basePriceBob,
        discount: rng.bool(0.15) ? { percent: rng.pick([5, 10]) } : undefined,
      }));

      const built = buildSale({
        lines,
        globalDiscountPercent: rng.bool(0.1) ? rng.pick([3, 5]) : undefined,
        roundingMode: "NEAREST_10",
      });

      const id = saleId();
      sales.push({
        id,
        folio: folio("V", ++saleFolio),
        clientSaleId: fakeUuidV7(uuidN++),
        deviceId: session.deviceId,
        seq: deviceSeq[session.deviceId],
        operatorId: session.operatorId,
        cashSessionId: session.id,
        subtotalBob: built.subtotalBob,
        discountBob: built.discountBob,
        roundingBob: built.roundingBob,
        totalBob: built.totalBob,
        occurredAtDevice: occurredAt,
        priceSnapshotAt: occurredAt,
      });
      grandTotalBob += built.totalBob;

      for (const line of built.lines) {
        saleItems.push({
          id: saleItemId(),
          saleId: id,
          variantId: line.variantId,
          qty: line.qty,
          unitPriceBob: line.unitPriceBob,
          discountBob: line.discountBob,
        });
        movements.push({
          id: movId(),
          variantId: line.variantId,
          kind: "VENTA",
          qty: -line.qty,
          occurredAt,
          sourceType: "sale",
          sourceId: id,
          operatorId: session.operatorId,
        });
      }

      // Pagos: 80 % efectivo completo, resto mixto o no efectivo.
      if (rng.bool(0.8)) {
        payments.push({
          id: paymentId(),
          saleId: id,
          methodId: cfg.cashMethodId,
          amountBob: built.totalBob,
        });
        session.cashInBob += built.totalBob;
      } else if (rng.bool(0.5)) {
        const cash = Math.round(built.totalBob / 2);
        payments.push({
          id: paymentId(),
          saleId: id,
          methodId: cfg.cashMethodId,
          amountBob: cash,
        });
        payments.push({
          id: paymentId(),
          saleId: id,
          methodId: rng.pick(cfg.nonCashMethodIds),
          amountBob: built.totalBob - cash,
        });
        session.cashInBob += cash;
      } else {
        payments.push({
          id: paymentId(),
          saleId: id,
          methodId: rng.pick(cfg.nonCashMethodIds),
          amountBob: built.totalBob,
        });
      }
    }

    // Cierre de turnos: movimientos de efectivo, esperado, contado, diferencia.
    for (const session of openSessions) {
      const openingBob = 20_000;
      const closedAt = new Date(
        session.openedAt.getTime() + rng.int(8, 11) * 3_600_000,
      );

      for (let m = 0; m < rng.int(0, 2); m++) {
        const kind = rng.pick(["INGRESO", "RETIRO", "GASTO"] as const);
        const amountBob =
          kind === "INGRESO" ? rng.int(50, 200) * 100 : rng.int(20, 2000) * 100;
        cashMovements.push({
          id: cashMovId(),
          cashSessionId: session.id,
          kind,
          amountBob,
          reason:
            kind === "GASTO"
              ? "insumos del local"
              : kind === "RETIRO"
                ? "a caja fuerte"
                : "cambio",
          operatorId: session.operatorId,
          occurredAt: new Date(
            session.openedAt.getTime() + rng.int(1, 7) * 3_600_000,
          ),
        });
        if (kind === "INGRESO") session.insBob += amountBob;
        else session.outsBob += amountBob;
      }

      const expectedBob =
        openingBob + session.cashInBob + session.insBob - session.outsBob;
      const noise = rng.bool(0.82)
        ? 0
        : rng.pick([-1550, -1000, -500, 500, 1200, -2050]);
      const countedBob = expectedBob + noise;

      sessions.push({
        id: session.id,
        operatorId: session.operatorId,
        deviceId: session.deviceId,
        openedAt: session.openedAt,
        closedAt,
        openingBob,
        expectedBob,
        countedBob,
        differenceBob: countedBob - expectedBob,
        note: noise !== 0 ? "diferencia registrada en el arqueo" : null,
      });
    }
  }

  // Insertar en orden: sesiones → ventas → items/pagos/movimientos.
  await inBatches(sessions, 500, (b) =>
    prisma.cashSession.createMany({ data: b as never }),
  );
  await inBatches(cashMovements, 1000, (b) =>
    prisma.cashMovement.createMany({ data: b as never }),
  );
  await inBatches(sales, 500, (b) =>
    prisma.sale.createMany({ data: b as never }),
  );
  await inBatches(saleItems, 1000, (b) =>
    prisma.saleItem.createMany({ data: b as never }),
  );
  await inBatches(payments, 1000, (b) =>
    prisma.payment.createMany({ data: b as never }),
  );
  await inBatches(movements, 1000, (b) =>
    prisma.stockMovement.createMany({ data: b as never }),
  );

  const orderCount = await seedOrders(prisma, rng, variants);

  return { saleCount: sales.length, orderCount, grandTotalBob };
}

const ORDER_STATUS_WEIGHTS: [string, number][] = [
  ["NUEVO", 0.15],
  ["CONFIRMADO", 0.2],
  ["PREPARADO", 0.15],
  ["ENTREGADO", 0.4],
  ["CANCELADO", 0.1],
];

async function seedOrders(
  prisma: PrismaClient,
  rng: Rng,
  variants: SeededVariant[],
): Promise<number> {
  const orderId = idFactory("ord");
  const orderItemId = idFactory("oitem");
  const total = 250;
  const orders: Record<string, unknown>[] = [];
  const items: Record<string, unknown>[] = [];

  for (let i = 0; i < total; i++) {
    let acc = rng.float();
    let status = "NUEVO";
    for (const [name, w] of ORDER_STATUS_WEIGHTS) {
      acc -= w;
      if (acc <= 0) {
        status = name;
        break;
      }
    }

    const built = buildSale({
      lines: rng.sample(variants, rng.int(1, 3)).map((v) => ({
        variantId: v.id,
        qty: rng.int(1, 2),
        baseUnitPriceBob: v.basePriceBob,
      })),
      roundingMode: "NEAREST_10",
    });

    const id = orderId();
    orders.push({
      id,
      folio: folio("P", i + 1),
      channel: "WHATSAPP",
      status,
      customerPhone: `+5917${rng.int(1000000, 9999999)}`,
      customerName: rng.pick(["Ana", "Luis", "Carla", "Marco", "Sofía"]),
      subtotalBob: built.subtotalBob,
      discountBob: built.discountBob,
      totalBob: built.totalBob,
      createdAt: new Date(ANCHOR_END - rng.int(0, DAYS) * 86_400_000),
    });
    for (const line of built.lines) {
      items.push({
        id: orderItemId(),
        orderId: id,
        variantId: line.variantId,
        qty: line.qty,
        unitPriceBob: line.unitPriceBob,
        discountBob: line.discountBob,
      });
    }
  }

  await inBatches(orders, 500, (b) =>
    prisma.order.createMany({ data: b as never }),
  );
  await inBatches(items, 1000, (b) =>
    prisma.orderItem.createMany({ data: b as never }),
  );
  return orders.length;
}
