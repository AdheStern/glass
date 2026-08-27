import { describe, expect, it } from "vitest";
import { dormantCapital, reorderList, stockCountDiff } from "./inventory";

describe("stockCountDiff (§14.3)", () => {
  it("ordena las diferencias por impacto en dinero descendente", () => {
    const diff = stockCountDiff([
      { variantId: "a", theoreticalQty: 10, countedQty: 9, unitCostBob: 500 },
      { variantId: "b", theoreticalQty: 4, countedQty: 1, unitCostBob: 12000 },
      { variantId: "c", theoreticalQty: 2, countedQty: 4, unitCostBob: 300 },
    ]);
    // b: 3×12000 = 36000 · c: 2×300 = 600 · a: 1×500 = 500
    expect(diff.map((d) => d.variantId)).toEqual(["b", "c", "a"]);
    expect(diff[0]).toMatchObject({ delta: -3, moneyImpactBob: 36000 });
  });

  it("ignora las variantes no contadas (toma parcial)", () => {
    const diff = stockCountDiff([
      {
        variantId: "a",
        theoreticalQty: 10,
        countedQty: null,
        unitCostBob: 500,
      },
      { variantId: "b", theoreticalQty: 4, countedQty: 2, unitCostBob: 500 },
    ]);
    expect(diff.map((d) => d.variantId)).toEqual(["b"]);
  });

  it("una diferencia de cero no genera ajuste", () => {
    expect(
      stockCountDiff([{ variantId: "a", theoreticalQty: 7, countedQty: 7 }]),
    ).toEqual([]);
  });
});

describe("reorderList (§14.4)", () => {
  it("propone reposición solo bajo el mínimo, hasta el doble", () => {
    const list = reorderList([
      { variantId: "a", qty: 2, minStock: 5 },
      { variantId: "b", qty: 8, minStock: 5 },
      { variantId: "c", qty: 0, minStock: 0 },
      { variantId: "d", qty: -1, minStock: 3 },
    ]);
    expect(list.map((r) => r.variantId)).toEqual(["d", "a"]);
    expect(list.find((r) => r.variantId === "a")?.suggestedQty).toBe(8);
    expect(list.find((r) => r.variantId === "d")?.suggestedQty).toBe(7);
  });
});

describe("dormantCapital (§14.4)", () => {
  const now = new Date("2026-08-27T00:00:00Z");

  it("lista lo que tiene existencia y no se movió en 90 días, por dinero", () => {
    const report = dormantCapital(
      [
        {
          variantId: "viejo",
          qty: 3,
          costBob: 10000,
          lastMovementAt: new Date("2026-01-01T00:00:00Z"),
        },
        {
          variantId: "reciente",
          qty: 5,
          costBob: 10000,
          lastMovementAt: new Date("2026-08-01T00:00:00Z"),
        },
        {
          variantId: "sin-movimiento",
          qty: 1,
          costBob: 50000,
          lastMovementAt: null,
        },
        {
          variantId: "agotado",
          qty: 0,
          costBob: 9999,
          lastMovementAt: new Date("2020-01-01T00:00:00Z"),
        },
      ],
      now,
    );
    expect(report.map((r) => r.variantId)).toEqual(["sin-movimiento", "viejo"]);
    expect(report[0]).toMatchObject({ idleDays: null, frozenBob: 50000 });
  });
});
