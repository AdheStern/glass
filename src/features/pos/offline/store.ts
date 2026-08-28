"use client";
// Glass — estado observable de la sincronización (§17.4). Lo consume el badge de
// la caja vía `useSyncExternalStore`.
import type { PackageStatus } from "@/domain/sync";

export interface SyncState {
  net: "online" | "offline";
  syncing: boolean;
  pending: number;
  packageStatus: PackageStatus;
  conflicts: number;
  lastError: string | null;
}

let state: SyncState = {
  net:
    typeof navigator !== "undefined" && "onLine" in navigator
      ? navigator.onLine
        ? "online"
        : "offline"
      : "online",
  syncing: false,
  pending: 0,
  packageStatus: "ok",
  conflicts: 0,
  lastError: null,
};

const listeners = new Set<() => void>();

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSyncState(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function patchSyncState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

let wired = false;

/** Escucha `online`/`offline` del navegador una sola vez. */
export function wireNetworkEvents(onOnline: () => void): void {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("online", () => {
    patchSyncState({ net: "online" });
    onOnline();
  });
  window.addEventListener("offline", () => patchSyncState({ net: "offline" }));
}
