// Glass — proyección de existencias desde el libro de movimientos (ADR-05). Puro.

export interface StockMovementLike {
  /** Negativo para salidas. */
  qty: number;
}

/** Existencia = suma de todos los asientos. Nunca se guarda como número mutable. */
export function projectStock(movements: readonly StockMovementLike[]): number {
  return movements.reduce((sum, m) => sum + m.qty, 0);
}

export const isNegativeStock = (qty: number): boolean => qty < 0;

/**
 * ¿La venta cobrada deja existencia negativa? Devuelve la proyección, nunca
 * lanza: la venta cobrada siempre gana (§1.2 principio 3), esto solo alimenta
 * la alerta.
 */
export function stockAfterSale(
  movements: readonly StockMovementLike[],
  soldQty: number,
): number {
  return projectStock(movements) - soldQty;
}
