"use client";
// Glass — base local de la caja (§17.1). Dexie sobre IndexedDB. Nada en la ruta
// de cobro toca la red: se escribe acá y la cola se sincroniza en segundo plano.
import Dexie, { type Table } from "dexie";

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface CatalogRow {
  variantId: string;
  productName: string;
  variantLabel: string | null;
  barcode: string | null;
  sku: string | null;
  priceBob: number;
  basePriceBob: number;
}

export interface StockRow {
  variantId: string;
  qty: number;
}

export interface OperatorRow {
  id: string;
  name: string;
  role: string;
  pinHash: string;
}

export interface MethodRow {
  id: string;
  label: string;
  countsInDrawer: boolean;
}

export type CommandKind = "SALE" | "VOID" | "CASH_MOVEMENT";

export interface QueueRow {
  clientId: string;
  deviceId: string;
  seq: number;
  kind: CommandKind;
  occurredAtDevice: string;
  payload: unknown;
  synced: 0 | 1;
  folio: string | null;
  createdAt: number;
}

export interface LocalSaleLine {
  name: string;
  qty: number;
  unitBob: number;
  lineBob: number;
}

export interface LocalSaleRow {
  clientSaleId: string;
  folio: string | null;
  sessionId: string;
  totalBob: number;
  changeBob: number;
  tenderedBob: number;
  methodLabel: string;
  lines: LocalSaleLine[];
  occurredAt: string;
  synced: 0 | 1;
}

class PosDb extends Dexie {
  meta!: Table<MetaRow, string>;
  catalog!: Table<CatalogRow, string>;
  stock!: Table<StockRow, string>;
  operators!: Table<OperatorRow, string>;
  methods!: Table<MethodRow, string>;
  settings!: Table<MetaRow, string>;
  queue!: Table<QueueRow, string>;
  localSales!: Table<LocalSaleRow, string>;

  constructor() {
    super("glass-pos");
    this.version(1).stores({
      meta: "key",
      catalog: "variantId, barcode, sku",
      stock: "variantId",
      operators: "id, role",
      methods: "id",
      settings: "key",
      queue: "clientId, seq, synced, [deviceId+seq]",
      localSales: "clientSaleId, synced, sessionId",
    });
  }
}

let instance: PosDb | null = null;

/** Instancia perezosa: nunca se construye durante el render del servidor. */
export function posDb(): PosDb {
  if (!instance) instance = new PosDb();
  return instance;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await posDb().meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await posDb().meta.put({ key, value });
}
