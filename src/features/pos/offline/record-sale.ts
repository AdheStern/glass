"use client";
// Glass — registrar una venta cobrada en la base local (§17.1, §17.5). Escribe el
// ticket y encola el comando SALE en **una sola transacción Dexie**: matar el
// proceso a mitad deja la venta entera o nada, nunca a medias.
import { changeDue } from "@/domain/arqueo";
import { buildSale, type RoundingMode } from "@/domain/sale";
import { nextSeq } from "@/domain/sync";
import { type CatalogRow, getMeta, posDb } from "./db";
import { getStoredSettings } from "./package";

const ROUNDING: Record<string, RoundingMode> = {
  NONE: "NONE",
  NEAREST_10: "NEAREST_10",
  NEAREST_50: "NEAREST_50",
};

export interface LocalSaleInput {
  clientSaleId: string;
  sessionId: string;
  lines: { variantId: string; qty: number; discountPercent?: number }[];
  globalDiscountPercent?: number;
  methodId: string;
  methodLabel: string;
  countsInDrawer: boolean;
  tenderedBob: number;
  authorizedByOperatorId?: string | null;
  orderId?: string;
}

export interface LocalSaleResult {
  clientSaleId: string;
  totalBob: number;
  changeBob: number;
}

function labelFor(c: CatalogRow | undefined): string {
  if (!c) return "Producto";
  return c.variantLabel
    ? `${c.productName} · ${c.variantLabel}`
    : c.productName;
}

export async function recordLocalSale(
  input: LocalSaleInput,
): Promise<LocalSaleResult> {
  const db = posDb();
  const [deviceId, appliedSeq, settings] = await Promise.all([
    getMeta<string>("deviceId"),
    getMeta<number>("deviceLastSeq"),
    getStoredSettings(),
  ]);

  const catalog = await db.catalog.bulkGet(input.lines.map((l) => l.variantId));
  const rowByVariant = new Map<string, CatalogRow>();
  const built = buildSale({
    lines: input.lines.map((l, i) => {
      const c = catalog[i];
      if (!c) throw new Error("Producto fuera del paquete de la caja");
      rowByVariant.set(l.variantId, c);
      return {
        variantId: l.variantId,
        qty: l.qty,
        baseUnitPriceBob: c.priceBob,
        discount: l.discountPercent
          ? { percent: l.discountPercent }
          : undefined,
      };
    }),
    globalDiscountPercent: input.globalDiscountPercent,
    roundingMode: ROUNDING[settings?.roundingMode ?? "NONE"] ?? "NONE",
  });

  const changeBob = input.countsInDrawer
    ? changeDue(built.totalBob, input.tenderedBob)
    : 0;
  const occurredAt = new Date().toISOString();

  await db.transaction("rw", [db.queue, db.localSales, db.stock], async () => {
    const last = await db.queue.orderBy("seq").last();
    const seq = nextSeq(Math.max(last?.seq ?? 0, appliedSeq ?? 0));

    await db.queue.add({
      clientId: input.clientSaleId,
      deviceId: deviceId ?? "",
      seq,
      kind: "SALE",
      occurredAtDevice: occurredAt,
      payload: {
        sessionId: input.sessionId,
        lines: input.lines,
        globalDiscountPercent: input.globalDiscountPercent,
        payments: [{ methodId: input.methodId, amountBob: built.totalBob }],
        tenderedBob: input.tenderedBob,
        orderId: input.orderId,
        authorizedByOperatorId: input.authorizedByOperatorId ?? null,
      },
      synced: 0,
      folio: null,
      createdAt: Date.now(),
    });

    await db.localSales.add({
      clientSaleId: input.clientSaleId,
      folio: null,
      sessionId: input.sessionId,
      totalBob: built.totalBob,
      changeBob,
      tenderedBob: input.tenderedBob,
      methodLabel: input.methodLabel,
      lines: built.lines.map((l) => ({
        name: labelFor(rowByVariant.get(l.variantId)),
        qty: l.qty,
        unitBob: l.unitPriceBob,
        lineBob: l.lineTotalBob,
      })),
      occurredAt,
      synced: 0,
    });

    for (const l of built.lines) {
      const s = await db.stock.get(l.variantId);
      if (s) await db.stock.put({ variantId: l.variantId, qty: s.qty - l.qty });
    }

    // Gancho del recorrido 3 de §23.1: simula la muerte del proceso a mitad del
    // cobro. La transacción Dexie revierte las tres tablas: no queda venta a
    // medias. Inerte salvo que una prueba levante la bandera.
    if (
      typeof window !== "undefined" &&
      (window as { __glassCrashNextSale?: boolean }).__glassCrashNextSale
    ) {
      (window as { __glassCrashNextSale?: boolean }).__glassCrashNextSale =
        false;
      throw new Error("glass/test: proceso interrumpido a mitad del cobro");
    }
  });

  return {
    clientSaleId: input.clientSaleId,
    totalBob: built.totalBob,
    changeBob,
  };
}

export async function getLocalSale(clientSaleId: string) {
  return posDb().localSales.get(clientSaleId);
}

export async function findLocalSaleByFolio(folio: string) {
  return posDb()
    .localSales.filter((s) => s.folio === folio)
    .first();
}

export async function pendingLocalSales(sessionId: string) {
  return posDb()
    .localSales.where("sessionId")
    .equals(sessionId)
    .and((s) => s.synced === 0)
    .toArray();
}
