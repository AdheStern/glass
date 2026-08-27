// Glass — cálculo de inventario (§14). Puro: recibe datos, devuelve datos.
// El reloj entra por parámetro (patrón de src/features/cart/hours.ts).

// ---------------------------------------------------------------------------
// Toma de inventario (§14.3): teórico congelado vs. contado → ajustes
// ---------------------------------------------------------------------------

export interface CountLineInput {
  variantId: string;
  /** Saldo teórico congelado al abrir la toma. */
  theoreticalQty: number;
  /** `null` = la variante no se contó (toma parcial): se ignora, no se pone en 0. */
  countedQty: number | null;
  /** Costo unitario en centavos, para ordenar por impacto en dinero. */
  unitCostBob?: number;
}

export interface CountAdjustment {
  variantId: string;
  theoreticalQty: number;
  countedQty: number;
  /** `countedQty - theoreticalQty`: el `qty` del asiento AJUSTE a generar. */
  delta: number;
  /** `|delta| * unitCostBob`. 0 si no hay costo. */
  moneyImpactBob: number;
}

/**
 * Solo las líneas con diferencia real, ordenadas por impacto en dinero
 * descendente (§14.3 paso 3). Las no contadas (`countedQty === null`) no
 * producen ajuste: una toma parcial es válida.
 */
export function stockCountDiff(
  lines: readonly CountLineInput[],
): CountAdjustment[] {
  const out: CountAdjustment[] = [];
  for (const l of lines) {
    if (l.countedQty === null) continue;
    const delta = l.countedQty - l.theoreticalQty;
    if (delta === 0) continue;
    out.push({
      variantId: l.variantId,
      theoreticalQty: l.theoreticalQty,
      countedQty: l.countedQty,
      delta,
      moneyImpactBob: Math.abs(delta) * (l.unitCostBob ?? 0),
    });
  }
  return out.sort(
    (a, b) =>
      b.moneyImpactBob - a.moneyImpactBob ||
      Math.abs(b.delta) - Math.abs(a.delta) ||
      a.variantId.localeCompare(b.variantId),
  );
}

// ---------------------------------------------------------------------------
// Reposición (§14.4): existencia bajo el mínimo de la variante
// ---------------------------------------------------------------------------

export interface ReorderRow {
  variantId: string;
  qty: number;
  minStock: number;
}

export interface ReorderSuggestion extends ReorderRow {
  /** Cuánto pedir para llegar al doble del mínimo, al menos 1. */
  suggestedQty: number;
}

export function reorderList(rows: readonly ReorderRow[]): ReorderSuggestion[] {
  return rows
    .filter((r) => r.minStock > 0 && r.qty <= r.minStock)
    .map((r) => ({
      ...r,
      suggestedQty: Math.max(1, r.minStock * 2 - r.qty),
    }))
    .sort((a, b) => a.qty - a.minStock - (b.qty - b.minStock));
}

// ---------------------------------------------------------------------------
// Capital dormido (§14.4): con existencia y sin venta en 90 días
// ---------------------------------------------------------------------------

export interface DormantRow {
  variantId: string;
  qty: number;
  costBob: number;
  lastMovementAt: Date | null;
}

export interface DormantReport extends DormantRow {
  /** Días desde el último movimiento; `null` si nunca hubo. */
  idleDays: number | null;
  /** Dinero inmovilizado: `qty * costBob`. */
  frozenBob: number;
}

const DAY_MS = 86_400_000;

export function dormantCapital(
  rows: readonly DormantRow[],
  now: Date,
  days = 90,
): DormantReport[] {
  const cutoff = now.getTime() - days * DAY_MS;
  return rows
    .filter(
      (r) =>
        r.qty > 0 &&
        (r.lastMovementAt === null || r.lastMovementAt.getTime() < cutoff),
    )
    .map((r) => ({
      ...r,
      idleDays: r.lastMovementAt
        ? Math.floor((now.getTime() - r.lastMovementAt.getTime()) / DAY_MS)
        : null,
      frozenBob: r.qty * r.costBob,
    }))
    .sort((a, b) => b.frozenBob - a.frozenBob);
}
