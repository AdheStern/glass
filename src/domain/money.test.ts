import { describe, expect, it } from "vitest";
import { applyPercent, assertCents, formatBob, roundTo10, roundToStep } from "./money";

describe("roundToStep", () => {
  it("redondea media-arriba al múltiplo pedido", () => {
    expect(roundTo10(58006)).toBe(58010);
    expect(roundTo10(58004)).toBe(58000);
    expect(roundTo10(58005)).toBe(58010);
    expect(roundToStep(12345, 50)).toBe(12350);
    expect(roundToStep(999, 1)).toBe(999);
  });
});

describe("applyPercent", () => {
  it("aplica porcentajes enteros", () => {
    expect(applyPercent(31000, 10)).toBe(3100);
    expect(applyPercent(59800, 3)).toBe(1794);
  });
});

describe("assertCents", () => {
  it("acepta enteros y rechaza decimales", () => {
    expect(() => assertCents(100)).not.toThrow();
    expect(() => assertCents(10.5)).toThrow();
  });
});

describe("formatBob", () => {
  it("formatea centavos a texto boliviano", () => {
    expect(formatBob(58010)).toBe("Bs 580,10");
    expect(formatBob(4)).toBe("Bs 0,04");
    expect(formatBob(-1550)).toBe("-Bs 15,50");
  });
});
