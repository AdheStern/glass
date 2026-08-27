import { describe, expect, it } from "vitest";
import { isNegativeStock, projectStock, stockAfterSale } from "./stock";

describe("projectStock", () => {
  it("suma los asientos del libro de movimientos", () => {
    // CANON-02: 4 iniciales − 3 − 2 − 1 = −2
    const movements = [{ qty: 4 }, { qty: -3 }, { qty: -2 }, { qty: -1 }];
    expect(projectStock(movements)).toBe(-2);
  });

  it("una existencia negativa es una alerta, no un error", () => {
    expect(isNegativeStock(projectStock([{ qty: 1 }, { qty: -3 }]))).toBe(true);
  });

  it("stockAfterSale no lanza aunque quede negativo", () => {
    expect(stockAfterSale([{ qty: 2 }], 5)).toBe(-3);
  });
});
