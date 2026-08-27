// Glass — resolución de precio efectivo. Puro (§24.2 regla 1).

import { applyPercent, type Cents } from "./money";

export interface LineDiscount {
  /** Porcentaje entero: `10` = 10 %. */
  percent?: number;
  /** Descuento fijo por unidad, en centavos. */
  amountBob?: Cents;
}

/**
 * Precio efectivo por unidad: primero el porcentaje, luego el monto fijo,
 * nunca por debajo de cero. Orden documentado y estable — no lo cambies sin
 * actualizar los casos de oro (Apéndice B).
 */
export function effectiveUnitPriceBob(
  baseUnitBob: Cents,
  discount?: LineDiscount,
): Cents {
  let price = baseUnitBob;
  if (discount?.percent) price -= applyPercent(price, discount.percent);
  if (discount?.amountBob) price -= discount.amountBob;
  return Math.max(0, price);
}
