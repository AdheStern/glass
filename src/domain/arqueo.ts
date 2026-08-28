// Glass — arqueo de caja y vuelto (§16.2). Puro: recibe centavos, devuelve
// centavos. El mismo cálculo en el servidor y (Fase 6) en la tablet sin conexión.
import type { Cents } from "./money";

/** Vuelto a entregar. Nunca negativo: si falta plata, es 0 y el cobro no cierra. */
export function changeDue(totalBob: Cents, tenderedBob: Cents): Cents {
  return Math.max(0, tenderedBob - totalBob);
}

export interface ArqueoInput {
  openingBob: Cents;
  /** Σ de los pagos en efectivo de las ventas del turno. */
  cashSalesBob: Cents;
  /** Σ de los movimientos de efectivo de tipo INGRESO. */
  cashInsBob: Cents;
  /** Σ de los movimientos de tipo RETIRO y GASTO. */
  cashOutsBob: Cents;
  /** Lo que el operador declaró haber contado, antes de ver lo esperado. */
  countedBob: Cents;
}

export interface ArqueoResult {
  expectedBob: Cents;
  /** contado − esperado. Negativo = falta; positivo = sobra. */
  differenceBob: Cents;
}

/**
 * §16.2: esperado = fondo + ventas en efectivo + ingresos − retiros.
 * Los cobros con QR/transferencia/tarjeta no están en el cajón: no entran acá.
 */
export function computeArqueo(input: ArqueoInput): ArqueoResult {
  const expectedBob =
    input.openingBob +
    input.cashSalesBob +
    input.cashInsBob -
    input.cashOutsBob;
  return { expectedBob, differenceBob: input.countedBob - expectedBob };
}

/** Se pide una nota cuando la diferencia supera el umbral configurado del sitio. */
export function needsDifferenceNote(
  differenceBob: Cents,
  thresholdBob: Cents,
): boolean {
  return Math.abs(differenceBob) > thresholdBob;
}

/**
 * ¿El cajero puede aplicar este descuento sin PIN superior? (§13.2, §6.4)
 * `capPercent = 0` (por defecto) → cualquier descuento pide autorización.
 */
export function canCashierDiscount(
  percent: number,
  capPercent: number,
): boolean {
  return percent <= capPercent;
}
