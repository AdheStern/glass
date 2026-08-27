import { describe, expect, it } from "vitest";
import { resolveBestPrice } from "./discount";

describe("resolveBestPrice (§13.2 — no acumulables, gana el de mayor beneficio)", () => {
  it("sin descuentos devuelve el precio base sin etiqueta", () => {
    expect(resolveBestPrice(10000, [])).toEqual({
      effectiveBob: 10000,
      label: null,
    });
  });

  it("aplica un porcentaje", () => {
    expect(resolveBestPrice(19450, [{ percent: 20, amountBob: null }])).toEqual(
      {
        effectiveBob: 15560,
        label: "−20%",
      },
    );
  });

  it("aplica un monto fijo", () => {
    expect(resolveBestPrice(4500, [{ percent: null, amountBob: 500 }])).toEqual(
      {
        effectiveBob: 4000,
        label: "Oferta",
      },
    );
  });

  it("entre dos descuentos gana el que deja el precio más bajo, no el primero", () => {
    const r = resolveBestPrice(10000, [
      { percent: 10, amountBob: null }, // → 9000
      { percent: null, amountBob: 2500 }, // → 7500 (gana)
    ]);
    expect(r).toEqual({ effectiveBob: 7500, label: "Oferta" });
  });

  it("no se acumulan: 10% + 10% no es 19%", () => {
    const r = resolveBestPrice(10000, [
      { percent: 10, amountBob: null },
      { percent: 10, amountBob: null },
    ]);
    expect(r.effectiveBob).toBe(9000);
  });

  it("nunca por debajo de cero", () => {
    expect(
      resolveBestPrice(300, [{ percent: null, amountBob: 1000 }]).effectiveBob,
    ).toBe(0);
  });
});
