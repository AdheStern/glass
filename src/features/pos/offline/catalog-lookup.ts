"use client";
// Glass — búsqueda y escaneo contra el catálogo de Dexie cuando no hay red.
import type { PosProduct } from "../types";
import { type CatalogRow, posDb } from "./db";

function toProduct(c: CatalogRow): PosProduct {
  return {
    variantId: c.variantId,
    productName: c.productName,
    variantLabel: c.variantLabel,
    basePriceBob: c.basePriceBob,
    effectiveBob: c.priceBob,
    stockQty: 0,
  };
}

export async function lookupOffline(code: string): Promise<PosProduct | null> {
  const term = code.trim();
  const byBarcode = await posDb().catalog.where("barcode").equals(term).first();
  if (byBarcode) return toProduct(byBarcode);
  const bySku = await posDb().catalog.where("sku").equals(term).first();
  return bySku ? toProduct(bySku) : null;
}

export async function searchOffline(query: string): Promise<PosProduct[]> {
  const term = query.trim().toLowerCase();
  if (!term) {
    return (await posDb().catalog.limit(24).toArray()).map(toProduct);
  }
  const rows = await posDb()
    .catalog.filter((c) => c.productName.toLowerCase().includes(term))
    .limit(60)
    .toArray();
  return rows.map(toProduct);
}

export function isOffline(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "onLine" in navigator &&
    !navigator.onLine
  );
}
