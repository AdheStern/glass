"use client";
// Glass — cola de comandos persistente y ordenada (§17.1). El `seq` es un
// correlativo por dispositivo, contiguo y creciente; se asigna dentro de una
// transacción Dexie para que no haya carreras.
import { nextSeq } from "@/domain/sync";
import { type CommandKind, getMeta, posDb, type QueueRow } from "./db";

/** Próximo `seq` a usar, dado lo ya encolado y lo ya aplicado en el servidor. */
export async function peekNextSeq(appliedSeq = 0): Promise<number> {
  const last = await posDb().queue.orderBy("seq").last();
  return nextSeq(Math.max(last?.seq ?? 0, appliedSeq));
}

/** Comandos aún sin sincronizar, en orden de `seq`. */
export async function pendingQueue(): Promise<QueueRow[]> {
  return posDb().queue.where("synced").equals(0).sortBy("seq");
}

export async function pendingCount(): Promise<number> {
  return posDb().queue.where("synced").equals(0).count();
}

export interface AckedCommand {
  clientId: string;
  folio: string | null;
}

/** Marca sincronizados los comandos con acuse y descarta los ya confirmados. */
export async function markAcked(acks: AckedCommand[]): Promise<void> {
  const db = posDb();
  await db.transaction("rw", [db.queue, db.localSales], async () => {
    for (const ack of acks) {
      await db.queue.update(ack.clientId, { synced: 1, folio: ack.folio });
      await db.localSales.update(ack.clientId, {
        synced: 1,
        folio: ack.folio ?? undefined,
      });
    }
    await db.queue.where("synced").equals(1).delete();
  });
}

export interface EnqueueInput {
  clientId: string;
  kind: CommandKind;
  occurredAtDevice: string;
  payload: unknown;
}

/**
 * Encola un comando que no es una venta (anulación, movimiento de efectivo). Las
 * ventas usan `recordLocalSale`, que encola y escribe el ticket en una sola
 * transacción.
 */
export async function enqueue(input: EnqueueInput): Promise<void> {
  const db = posDb();
  const [deviceId, appliedSeq] = await Promise.all([
    getMeta<string>("deviceId"),
    getMeta<number>("deviceLastSeq"),
  ]);
  await db.transaction("rw", db.queue, async () => {
    const seq = await peekNextSeq(appliedSeq ?? 0);
    await db.queue.add({
      clientId: input.clientId,
      deviceId: deviceId ?? "",
      seq,
      kind: input.kind,
      occurredAtDevice: input.occurredAtDevice,
      payload: input.payload,
      synced: 0,
      folio: null,
      createdAt: Date.now(),
    });
  });
}
