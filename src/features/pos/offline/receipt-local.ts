"use client";
import { posDevice, posOperator } from "../pos-session";
// Glass — comprobante de una venta aún no sincronizada, armado desde Dexie
// (§17.5: el ticket manda). El folio `V-` llega con el acuse.
import type { ReceiptView } from "../receipt";
import type { LocalSaleRow } from "./db";
import { getStoredSettings } from "./package";
import { findLocalSaleByFolio, getLocalSale } from "./record-sale";

export async function localReceipt(ref: string): Promise<ReceiptView | null> {
  const row =
    (await getLocalSale(ref)) ?? (await findLocalSaleByFolio(ref)) ?? null;
  if (!row) return null;
  return toReceiptView(row);
}

async function toReceiptView(row: LocalSaleRow): Promise<ReceiptView> {
  const settings = await getStoredSettings();
  const device = posDevice.get();
  const operator = posOperator.get();
  const subtotal = row.lines.reduce((s, l) => s + l.unitBob * l.qty, 0);

  return {
    folio: row.folio ?? "Pendiente de sincronizar",
    siteName: settings?.name ?? "Glass",
    deviceName: device?.name ?? "Caja",
    operatorName: operator?.operatorName ?? "",
    occurredAt: new Date(row.occurredAt),
    voidedAt: null,
    items: row.lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      unitPriceBob: l.unitBob,
      lineBob: l.lineBob,
    })),
    subtotalBob: subtotal,
    discountBob: Math.max(0, subtotal - row.totalBob),
    roundingBob: 0,
    totalBob: row.totalBob,
    payments: [{ label: row.methodLabel, amountBob: row.totalBob }],
    footer:
      settings?.receiptFooter?.trim() ||
      "Nota de venta · no válida como factura",
  };
}
