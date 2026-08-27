// Glass — dinero. SIEMPRE centavos enteros (§24.1). Puro, sin dependencias.

/** Centavos enteros. `31000` = Bs 310,00. */
export type Cents = number;

export function assertCents(n: number): asserts n is Cents {
  if (!Number.isInteger(n)) {
    throw new Error(
      `glass/money: se esperaba un entero de centavos, llegó ${n}`,
    );
  }
}

/**
 * Redondeo media-arriba a un múltiplo de `step` centavos.
 * `step = 1` no redondea; `10` redondea al 0,10; `50` al 0,50.
 */
export function roundToStep(cents: Cents, step: number): Cents {
  if (step <= 1) return Math.round(cents);
  return Math.round(cents / step) * step;
}

export const roundTo10 = (cents: Cents): Cents => roundToStep(cents, 10);
export const roundTo50 = (cents: Cents): Cents => roundToStep(cents, 50);

/**
 * Aplica un porcentaje entero (`10` = 10 %) sobre un monto, media-arriba.
 * El dinero de Glass es no negativo, así que el redondeo de JS es correcto.
 */
export function applyPercent(amount: Cents, percent: number): Cents {
  return Math.round((amount * percent) / 100);
}

/** Formatea centavos a texto local (solo para pruebas/depuración, no para UI). */
export function formatBob(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}Bs ${whole.toLocaleString("es-BO")},${frac}`;
}
