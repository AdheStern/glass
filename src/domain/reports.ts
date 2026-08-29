// Glass — cálculo puro para el tablero y los reportes (§18). Sin Prisma, sin
// reloj: recibe datos y devuelve datos.

/** Variación contra el mismo día de la semana anterior (§18.1: nunca contra ayer). */
export interface WowDelta {
  current: number;
  previous: number;
  /** Diferencia relativa en %; `null` si no hay base de comparación. */
  pct: number | null;
  direction: "up" | "down" | "flat";
}

export function weekOverWeek(current: number, previous: number): WowDelta {
  if (previous === 0) {
    return {
      current,
      previous,
      pct: current === 0 ? 0 : null,
      direction: current === 0 ? "flat" : "up",
    };
  }
  const pct = ((current - previous) / previous) * 100;
  const direction = pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  return { current, previous, pct, direction };
}

/** Margen bruto en % sobre la venta neta. `null` si no hay costo cargado. */
export function marginPercent(netBob: number, cogsBob: number): number | null {
  if (netBob <= 0 || cogsBob <= 0) return null;
  return ((netBob - cogsBob) / netBob) * 100;
}

/**
 * Puntos de una polilínea SVG para una serie, normalizada a `width` × `height`.
 * El eje Y arranca en 0 y llega al máximo de la serie (o 1 si es toda ceros).
 */
export function sparklinePoints(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length === 0) return "";
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = Math.round(i * step * 100) / 100;
      const y = Math.round((height - (v / max) * height) * 100) / 100;
      return `${x},${y}`;
    })
    .join(" ");
}

/** Días (fecha ISO `YYYY-MM-DD`) desde `from` hasta `to`, ambos inclusive. */
export function dateRange(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  while (d.getTime() <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
