import { describe, expect, it } from "vitest";
import { effectiveUnitPriceBob } from "./pricing";

describe("effectiveUnitPriceBob", () => {
  it("sin descuento devuelve el precio base", () => {
    expect(effectiveUnitPriceBob(31000)).toBe(31000);
  });

  it("aplica el porcentaje (CANON-01, línea 1)", () => {
    expect(effectiveUnitPriceBob(31000, { percent: 10 })).toBe(27900);
  });

  it("aplica el monto fijo (CANON-01, línea 2)", () => {
    expect(effectiveUnitPriceBob(4500, { amountBob: 500 })).toBe(4000);
  });

  it("porcentaje primero, luego monto fijo", () => {
    expect(effectiveUnitPriceBob(10000, { percent: 10, amountBob: 500 })).toBe(
      8500,
    );
  });

  it("nunca por debajo de cero", () => {
    expect(effectiveUnitPriceBob(300, { amountBob: 1000 })).toBe(0);
  });
});
