// Glass — reglas puras de la sincronización sin conexión (§17.2). Sin red, sin
// Prisma, sin reloj: recibe `now` en milisegundos. El mismo código valida la
// cola en la tablet y ordena el lote en el servidor.

export type SyncCommandKind = "SALE" | "VOID" | "CASH_MOVEMENT";

/**
 * Un comando de la cola persistente de la tablet (§17.1). `clientId` es la clave
 * de idempotencia (UUID v7 del navegador); `seq` es el correlativo por
 * dispositivo, contiguo y creciente (§17.2 reglas 1 y 3).
 */
export interface SyncCommand<P = unknown> {
  clientId: string;
  deviceId: string;
  seq: number;
  kind: SyncCommandKind;
  /** Reloj del dispositivo (§17.2 regla 5). ISO 8601. */
  occurredAtDevice: string;
  payload: P;
}

/** Acuse que el servidor devuelve por cada comando aplicado. */
export interface SyncAck {
  clientId: string;
  seq: number;
  folio: string | null;
  serverId: string;
}

/** Forma mínima de un comando para las reglas de orden y de cola. */
type Seqd = { seq: number; clientId: string };

/** Próximo `seq` para la cola local dado el máximo ya encolado (0 si vacía). */
export function nextSeq(maxSeq: number): number {
  return Math.max(0, Math.floor(maxSeq || 0)) + 1;
}

export function sortBySeq<T extends { seq: number }>(commands: T[]): T[] {
  return [...commands].sort((a, b) => a.seq - b.seq);
}

export interface BatchPlan<T> {
  /** `seq` ya aplicados (reenvío tras red cortada): se re-acusan, no es error. */
  alreadyApplied: number[];
  /** Comandos nuevos, contiguos desde `appliedSeq + 1`, en orden. */
  toApply: T[];
  /** Si el lote tiene un hueco: el `seq` que el servidor espera a continuación. */
  gapAt?: number;
  /** Si el lote trae dos comandos con el mismo `seq`. */
  duplicateSeq?: number;
}

/**
 * Decide qué hacer con un lote entrante dado el último `seq` aplicado por el
 * dispositivo (§17.2 regla 3: se aplica en orden y se rechazan los huecos).
 */
export function planBatch<T extends { seq: number }>(
  commands: T[],
  appliedSeq: number,
): BatchPlan<T> {
  const sorted = sortBySeq(commands);
  const alreadyApplied: number[] = [];
  const toApply: T[] = [];
  let expected = appliedSeq + 1;

  for (let i = 0; i < sorted.length; i++) {
    const cmd = sorted[i];
    if (i > 0 && cmd.seq === sorted[i - 1].seq) {
      return { alreadyApplied, toApply, duplicateSeq: cmd.seq };
    }
    if (cmd.seq <= appliedSeq) {
      alreadyApplied.push(cmd.seq);
      continue;
    }
    if (cmd.seq !== expected) {
      return { alreadyApplied, toApply, gapAt: expected };
    }
    toApply.push(cmd);
    expected++;
  }
  return { alreadyApplied, toApply };
}

/** Valida que la cola local no tenga huecos ni repetidos desde `appliedSeq`. */
export function validateQueue<T extends { seq: number }>(
  commands: T[],
  appliedSeq = 0,
): { ok: true } | { ok: false; reason: "gap" | "duplicate"; at: number } {
  const plan = planBatch(commands, appliedSeq);
  if (plan.duplicateSeq != null) {
    return { ok: false, reason: "duplicate", at: plan.duplicateSeq };
  }
  if (plan.gapAt != null) return { ok: false, reason: "gap", at: plan.gapAt };
  return { ok: true };
}

/** Comandos de la cola aún sin acuse, en orden de `seq`. */
export function pendingCommands<T extends Seqd>(
  queue: T[],
  ackedClientIds: Iterable<string>,
): T[] {
  const acked = new Set(ackedClientIds);
  return sortBySeq(queue).filter((c) => !acked.has(c.clientId));
}

/** La cola sin los comandos que ya tienen acuse. */
export function applyAcks<T extends { clientId: string }>(
  queue: T[],
  acks: { clientId: string }[],
): T[] {
  const acked = new Set(acks.map((a) => a.clientId));
  return queue.filter((c) => !acked.has(c.clientId));
}

export type PackageStatus = "ok" | "warn" | "blocked";

/**
 * Caducidad del paquete (§17.2 regla 6): a las `warnHours` sin sincronizar se
 * avisa; a las `blockHours` se bloquean las ventas nuevas.
 */
export function packageStatus(
  lastSyncAtMs: number,
  nowMs: number,
  warnHours = 24,
  blockHours = 72,
): PackageStatus {
  const ageHours = (nowMs - lastSyncAtMs) / 3_600_000;
  if (ageHours >= blockHours) return "blocked";
  if (ageHours >= warnHours) return "warn";
  return "ok";
}

/**
 * Existencia informativa local: la de referencia del paquete menos lo vendido
 * sin conexión. Puede quedar negativa y **se permite** (§17.2 regla 4, CANON-02).
 */
export function localStockView(
  referenceQty: number,
  soldOffline: number,
): number {
  return referenceQty - soldOffline;
}
