"use client";
// Glass — arranque de la caja desde el paquete de Dexie cuando no hay red (§17.1).
import type { PosBootstrap } from "../types";
import { getMeta, posDb } from "./db";
import { getStoredSettings } from "./package";

interface DeviceLike {
  id: string;
  name: string;
}

interface SessionLike {
  id: string;
  operatorId: string;
  operatorName: string;
}

export async function offlineBootstrap(
  device: DeviceLike,
  session: SessionLike | null,
): Promise<PosBootstrap | null> {
  const settings = await getStoredSettings();
  if (!settings) return null;

  const [operators, methods, catalog, categories] = await Promise.all([
    posDb().operators.toArray(),
    posDb().methods.toArray(),
    posDb().catalog.limit(24).toArray(),
    getMeta<{ id: string; name: string }[]>("categories"),
  ]);

  return {
    device,
    operators: operators.map((o) => ({
      id: o.id,
      name: o.name,
      role: o.role,
    })),
    paymentMethods: methods,
    categories: categories ?? [],
    openSession: session
      ? {
          id: session.id,
          operatorId: session.operatorId,
          operatorName: session.operatorName,
          openedAt: new Date(),
          openingBob: 0,
        }
      : null,
    settings: {
      name: settings.name,
      roundingMode: settings.roundingMode,
      maxCashierDiscountPercent: settings.maxCashierDiscountPercent,
      cashDifferenceThresholdBob: settings.cashDifferenceThresholdBob,
    },
    topSellers: catalog.map((c) => ({
      variantId: c.variantId,
      productName: c.productName,
      variantLabel: c.variantLabel,
      basePriceBob: c.basePriceBob,
      effectiveBob: c.priceBob,
      stockQty: 0,
    })),
  };
}
