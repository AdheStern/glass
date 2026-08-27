// Glass — traducción pura de existencias a etiqueta según los 3 modos del §7.2.
export type StockDisplay = "EXACTO" | "UMBRAL" | "OCULTO";
export type StockKind = "in" | "low" | "available" | "out";

export interface StockView {
  kind: StockKind;
  text: string;
  /** Solo en modo EXACTO. */
  qty?: number;
  available: boolean;
}

export function labelFor(
  qty: number,
  mode: StockDisplay,
  threshold: number,
): StockView {
  if (qty <= 0) return { kind: "out", text: "Agotado", available: false };

  if (mode === "EXACTO") {
    return { kind: "in", text: `Quedan ${qty}`, qty, available: true };
  }
  if (mode === "OCULTO") {
    return { kind: "available", text: "Disponible", available: true };
  }
  return qty <= threshold
    ? { kind: "low", text: "Últimas unidades", available: true }
    : { kind: "in", text: "Disponible", available: true };
}
