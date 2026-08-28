"use client";
import { useSyncExternalStore } from "react";
import {
  getSyncState,
  type SyncState,
  subscribeSyncState,
} from "../offline/store";

const SERVER: SyncState = {
  net: "online",
  syncing: false,
  pending: 0,
  packageStatus: "ok",
  conflicts: 0,
  lastError: null,
};

export function useSyncStatus(): SyncState {
  return useSyncExternalStore(subscribeSyncState, getSyncState, () => SERVER);
}
