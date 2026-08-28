import "server-only";
// Glass — paquete que el servidor entrega a una tablet para operar sin conexión
// (§17.3). Solo texto: catálogo, precios efectivos, hashes de PIN, existencias de
// referencia. Sin costos, sin márgenes, sin datos de otros dispositivos, sin fotos.
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { getVariantPricing } from "@/features/orders/pricing";

export interface SyncPackage {
  serverTime: string;
  settings: {
    name: string;
    roundingMode: string;
    maxCashierDiscountPercent: number;
    cashDifferenceThresholdBob: number;
    receiptFooter: string | null;
    packageWarnHours: number;
    packageBlockHours: number;
  };
  paymentMethods: { id: string; label: string; countsInDrawer: boolean }[];
  categories: { id: string; name: string }[];
  operators: { id: string; name: string; role: string; pinHash: string }[];
  catalog: {
    variantId: string;
    productName: string;
    variantLabel: string | null;
    barcode: string | null;
    sku: string | null;
    priceBob: number;
    basePriceBob: number;
  }[];
  referenceStock: { variantId: string; qty: number }[];
}

export interface FreshPackage {
  serverTime: string;
  referenceStock: { variantId: string; qty: number }[];
  prices: { variantId: string; priceBob: number }[];
}

async function activeVariants() {
  return prisma.variant.findMany({
    where: {
      archivedAt: null,
      product: { isActive: true, archivedAt: null },
    },
    select: { id: true, barcode: true, sku: true },
  });
}

/** Paquete completo (§17.3). */
export async function buildSyncPackage(): Promise<SyncPackage> {
  const [settings, methods, categories, operators, variants] =
    await Promise.all([
      getSiteSettings(),
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
      prisma.operator.findMany({
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true, pinHash: true },
      }),
      activeVariants(),
    ]);

  const pricing = await getVariantPricing(variants.map((v) => v.id));
  const byId = new Map(variants.map((v) => [v.id, v]));
  const catalog: SyncPackage["catalog"] = [];
  const referenceStock: SyncPackage["referenceStock"] = [];
  for (const [id, p] of pricing) {
    const v = byId.get(id);
    catalog.push({
      variantId: id,
      productName: p.productName,
      variantLabel: p.variantLabel,
      barcode: v?.barcode ?? null,
      sku: v?.sku ?? null,
      priceBob: p.effectiveBob,
      basePriceBob: p.basePriceBob,
    });
    referenceStock.push({ variantId: id, qty: p.stockQty });
  }

  return {
    serverTime: new Date().toISOString(),
    settings: {
      name: settings.name,
      roundingMode: settings.roundingMode,
      maxCashierDiscountPercent: settings.maxCashierDiscountPercent,
      cashDifferenceThresholdBob: settings.cashDifferenceThresholdBob,
      receiptFooter: settings.receiptFooter,
      packageWarnHours: settings.packageWarnHours,
      packageBlockHours: settings.packageBlockHours,
    },
    paymentMethods: methods,
    categories,
    operators,
    catalog,
    referenceStock,
  };
}

/** Solo lo que cambia seguido — se devuelve en cada acuse de lote (§17.1). */
export async function buildFreshPackage(): Promise<FreshPackage> {
  const variants = await activeVariants();
  const pricing = await getVariantPricing(variants.map((v) => v.id));
  const referenceStock: FreshPackage["referenceStock"] = [];
  const prices: FreshPackage["prices"] = [];
  for (const [id, p] of pricing) {
    referenceStock.push({ variantId: id, qty: p.stockQty });
    prices.push({ variantId: id, priceBob: p.effectiveBob });
  }
  return { serverTime: new Date().toISOString(), referenceStock, prices };
}
