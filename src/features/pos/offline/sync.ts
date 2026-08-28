"use client";
// Glass — proceso de fondo de la sincronización (§17.1). El cajero solo lo ve
// como un indicador; nunca bloquea una venta.
import { posDb, setMeta } from "./db";
import { refreshPackageStatus } from "./package";
import { markAcked, pendingCount, pendingQueue } from "./queue";
import { patchSyncState, wireNetworkEvents } from "./store";

interface FreshPackage {
  referenceStock?: { variantId: string; qty: number }[];
  prices?: { variantId: string; priceBob: number }[];
}

async function applyFresh(pkg: FreshPackage): Promise<void> {
  const db = posDb();
  await db.transaction("rw", [db.stock, db.catalog], async () => {
    for (const s of pkg.referenceStock ?? []) await db.stock.put(s);
    for (const p of pkg.prices ?? []) {
      const c = await db.catalog.get(p.variantId);
      if (c) await db.catalog.put({ ...c, priceBob: p.priceBob });
    }
  });
}

let inFlight: Promise<void> | null = null;

export function syncNow(token: string): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doSync(token).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doSync(token: string): Promise<void> {
  const pending = await pendingQueue();
  patchSyncState({ pending: pending.length });
  if (pending.length === 0) {
    await refreshPackageStatus();
    return;
  }
  if (
    typeof navigator !== "undefined" &&
    "onLine" in navigator &&
    !navigator.onLine
  ) {
    return;
  }

  patchSyncState({ syncing: true, lastError: null });
  try {
    const res = await fetch("/api/sync/batch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-pos-device-token": token,
      },
      body: JSON.stringify({
        commands: pending.map((c) => ({
          clientId: c.clientId,
          deviceId: c.deviceId,
          seq: c.seq,
          kind: c.kind,
          occurredAtDevice: c.occurredAtDevice,
          payload: c.payload,
        })),
      }),
    });

    if (res.status === 409) {
      patchSyncState({ lastError: "conflicto de secuencia en la cola" });
      return;
    }
    if (!res.ok) {
      patchSyncState({ lastError: `sincronización HTTP ${res.status}` });
      return;
    }
    const data = await res.json();
    if (data.quarantined) {
      patchSyncState({
        lastError: "dispositivo en cuarentena: avisá al dueño",
      });
      return;
    }

    await markAcked(
      (data.acks ?? []).map(
        (a: { clientId: string; folio: string | null }) => ({
          clientId: a.clientId,
          folio: a.folio,
        }),
      ),
    );
    const maxSeq = Math.max(
      0,
      ...(data.acks ?? []).map((a: { seq: number }) => a.seq),
    );
    if (maxSeq > 0) await setMeta("deviceLastSeq", maxSeq);
    if (data.package) await applyFresh(data.package);
    await setMeta("lastSyncAt", Date.now());
    patchSyncState({
      conflicts: (data.alerts ?? []).length,
      pending: await pendingCount(),
    });
  } catch (e) {
    patchSyncState({
      lastError: e instanceof Error ? e.message : "error de red",
    });
  } finally {
    patchSyncState({ syncing: false });
    await refreshPackageStatus();
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Arranca los disparadores de sincronización de fondo (§17.1). */
export function startSyncLoop(token: string): () => void {
  wireNetworkEvents(() => void syncNow(token));
  const tick = () => void syncNow(token);
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 60_000);
  const onVisible = () => {
    if (document.visibilityState === "visible") tick();
  };
  document.addEventListener("visibilitychange", onVisible);
  void syncNow(token);
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
    document.removeEventListener("visibilitychange", onVisible);
  };
}
