// Glass — construcción y validación de una venta. Puro (§24.2 regla 1).
// El mismo cálculo corre en el servidor al confirmar y en la tablet sin conexión.

import { applyPercent, type Cents, roundToStep } from "./money";
import { effectiveUnitPriceBob, type LineDiscount } from "./pricing";

export type RoundingMode = "NONE" | "NEAREST_10" | "NEAREST_50";

const STEP: Record<RoundingMode, number> = {
  NONE: 1,
  NEAREST_10: 10,
  NEAREST_50: 50,
};

export interface SaleLineInput {
  variantId: string;
  qty: number;
  baseUnitPriceBob: Cents;
  discount?: LineDiscount;
}

export interface BuildSaleInput {
  lines: SaleLineInput[];
  /** Descuento global de caja, porcentaje entero (`3` = 3 %). */
  globalDiscountPercent?: number;
  roundingMode?: RoundingMode;
}

export interface SaleLineResult {
  variantId: string;
  qty: number;
  unitPriceBob: Cents;
  discountBob: Cents;
  lineTotalBob: Cents;
}

export interface BuildSaleResult {
  lines: SaleLineResult[];
  subtotalBob: Cents;
  discountBob: Cents;
  /** total − (subtotal − descuento global). Se guarda, aparece en el arqueo,
   *  NO se reparte entre las líneas (Apéndice B, CANON-01). */
  roundingBob: Cents;
  totalBob: Cents;
}

export function buildSale(input: BuildSaleInput): BuildSaleResult {
  if (input.lines.length === 0) {
    throw new Error("glass/sale: una venta necesita al menos una línea");
  }

  const lines: SaleLineResult[] = input.lines.map((l) => {
    if (!Number.isInteger(l.qty) || l.qty <= 0) {
      throw new Error(
        `glass/sale: cantidad inválida (${l.qty}) para ${l.variantId}`,
      );
    }
    const unit = effectiveUnitPriceBob(l.baseUnitPriceBob, l.discount);
    const lineTotal = unit * l.qty;
    return {
      variantId: l.variantId,
      qty: l.qty,
      unitPriceBob: unit,
      discountBob: l.baseUnitPriceBob * l.qty - lineTotal,
      lineTotalBob: lineTotal,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotalBob, 0);
  const globalDiscount = input.globalDiscountPercent
    ? applyPercent(subtotal, input.globalDiscountPercent)
    : 0;
  const preRounding = subtotal - globalDiscount;
  const total = roundToStep(preRounding, STEP[input.roundingMode ?? "NONE"]);

  return {
    lines,
    subtotalBob: subtotal,
    discountBob: globalDiscount,
    roundingBob: total - preRounding,
    totalBob: total,
  };
}

/** UUID v7 generado en el dispositivo — clave de idempotencia de la sincronización. */
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidClientSaleId(id: string): boolean {
  return UUID_V7.test(id);
}
