import { describe, expect, it } from "vitest";
import canon01 from "./__canon__/canon-01.json";
import { type BuildSaleInput, buildSale, isValidClientSaleId } from "./sale";

describe("buildSale", () => {
  it("CANON-01 · dinero y descuentos → Bs 580,10 con roundingBob +4", () => {
    const result = buildSale(canon01.input as unknown as BuildSaleInput);

    expect(result.subtotalBob).toBe(canon01.expected.subtotalBob);
    expect(result.discountBob).toBe(canon01.expected.discountBob);
    expect(result.roundingBob).toBe(canon01.expected.roundingBob);
    expect(result.totalBob).toBe(canon01.expected.totalBob);

    for (const expected of canon01.expected.lines) {
      const line = result.lines.find((l) => l.variantId === expected.variantId);
      expect(line?.unitPriceBob).toBe(expected.unitPriceBob);
      expect(line?.lineTotalBob).toBe(expected.lineTotalBob);
    }
  });

  it("sin descuentos ni redondeo, el total es la suma de las líneas", () => {
    const r = buildSale({
      lines: [
        { variantId: "a", qty: 3, baseUnitPriceBob: 1000 },
        { variantId: "b", qty: 1, baseUnitPriceBob: 250 },
      ],
    });
    expect(r.subtotalBob).toBe(3250);
    expect(r.discountBob).toBe(0);
    expect(r.roundingBob).toBe(0);
    expect(r.totalBob).toBe(3250);
  });

  it("rechaza cantidades no positivas y ventas vacías", () => {
    expect(() => buildSale({ lines: [] })).toThrow();
    expect(() =>
      buildSale({ lines: [{ variantId: "a", qty: 0, baseUnitPriceBob: 100 }] }),
    ).toThrow();
  });
});

describe("isValidClientSaleId", () => {
  it("acepta un UUID v7 y rechaza otros", () => {
    expect(isValidClientSaleId("018f8c1e-7b2a-7c3d-8e4f-1a2b3c4d5e6f")).toBe(
      true,
    );
    expect(isValidClientSaleId("not-a-uuid")).toBe(false);
    expect(isValidClientSaleId("018f8c1e-7b2a-4c3d-8e4f-1a2b3c4d5e6f")).toBe(
      false,
    ); // v4
  });
});
