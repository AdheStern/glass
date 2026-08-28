"use client";
// Glass — descarga y guarda el paquete inicial (§17.3). Se llama con red, tras
// emparejar o abrir turno.
import { packageStatus } from "@/domain/sync";
import { getMeta, posDb, setMeta } from "./db";
import { patchSyncState } from "./store";

export interface StoredSettings {
  name: string;
  roundingMode: string;
  maxCashierDiscountPercent: number;
  cashDifferenceThresholdBob: number;
  receiptFooter: string | null;
  packageWarnHours: number;
  packageBlockHours: number;
}

export async function fetchAndStorePackage(token: string): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch("/api/sync/package", {
      headers: { "x-pos-device-token": token },
      cache: "no-store",
    });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const pkg = await res.json();
  const db = posDb();

  await db.transaction(
    "rw",
    [db.meta, db.catalog, db.stock, db.operators, db.methods, db.settings],
    async () => {
      await db.catalog.clear();
      await db.catalog.bulkPut(pkg.catalog);
      await db.stock.clear();
      await db.stock.bulkPut(pkg.referenceStock);
      await db.operators.clear();
      await db.operators.bulkPut(pkg.operators);
      await db.methods.clear();
      await db.methods.bulkPut(pkg.paymentMethods);
      await db.settings.put({ key: "settings", value: pkg.settings });
      await db.meta.put({ key: "deviceId", value: pkg.deviceId });
      await db.meta.put({ key: "deviceLastSeq", value: pkg.deviceLastSeq });
      await db.meta.put({ key: "categories", value: pkg.categories });
      await db.meta.put({ key: "lastSyncAt", value: Date.now() });
      await db.meta.put({ key: "packageFetchedAt", value: Date.now() });
    },
  );
  await refreshPackageStatus();
  return true;
}

export async function hasPackage(): Promise<boolean> {
  try {
    return (await posDb().catalog.count()) > 0;
  } catch {
    return false;
  }
}

export async function getStoredSettings(): Promise<StoredSettings | null> {
  const row = await posDb().settings.get("settings");
  return (row?.value as StoredSettings | undefined) ?? null;
}

/** Recalcula el estado de caducidad del paquete y lo publica al store (§17.2 r6). */
export async function refreshPackageStatus(): Promise<void> {
  const settings = await getStoredSettings();
  const lastSyncAt = (await getMeta<number>("lastSyncAt")) ?? 0;
  const status = packageStatus(
    lastSyncAt,
    Date.now(),
    settings?.packageWarnHours ?? 24,
    settings?.packageBlockHours ?? 72,
  );
  patchSyncState({ packageStatus: status });
}

export { setMeta };
