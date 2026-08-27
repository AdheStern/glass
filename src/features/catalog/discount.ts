// Glass — resolución del mejor descuento. Puro (reutiliza src/domain/pricing).
// Regla §13.2: los descuentos NO se acumulan; gana el de mayor beneficio.
import { effectiveUnitPriceBob, type LineDiscount } from "@/domain/pricing";

export interface DiscountInput {
  percent: number | null;
  amountBob: number | null;
}

export interface BestPrice {
  effectiveBob: number;
  label: string | null;
}

export function resolveBestPrice(
  baseBob: number,
  discounts: DiscountInput[],
): BestPrice {
  let best = baseBob;
  let winner: DiscountInput | null = null;

  for (const d of discounts) {
    const cand: LineDiscount =
      d.percent != null
        ? { percent: d.percent }
        : { amountBob: d.amountBob ?? 0 };
    const price = effectiveUnitPriceBob(baseBob, cand);
    if (price < best) {
      best = price;
      winner = d;
    }
  }

  return {
    effectiveBob: best,
    label:
      best < baseBob
        ? winner?.percent != null
          ? `−${winner.percent}%`
          : "Oferta"
        : null,
  };
}
