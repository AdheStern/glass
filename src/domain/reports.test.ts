import { describe, expect, it } from "vitest";
import {
  dateRange,
  marginPercent,
  sparklinePoints,
  weekOverWeek,
} from "./reports";

describe("weekOverWeek", () => {
  it("calcula el % contra la semana anterior", () => {
    expect(weekOverWeek(120, 100)).toMatchObject({ pct: 20, direction: "up" });
    expect(weekOverWeek(80, 100)).toMatchObject({
      pct: -20,
      direction: "down",
    });
  });
  it("sin base de comparación devuelve pct null", () => {
    expect(weekOverWeek(50, 0).pct).toBeNull();
    expect(weekOverWeek(0, 0)).toMatchObject({ pct: 0, direction: "flat" });
  });
});

describe("marginPercent", () => {
  it("margen bruto sobre la venta neta", () => {
    expect(marginPercent(1000, 600)).toBeCloseTo(40);
  });
  it("sin costo cargado devuelve null", () => {
    expect(marginPercent(1000, 0)).toBeNull();
    expect(marginPercent(0, 0)).toBeNull();
  });
});

describe("sparklinePoints", () => {
  it("normaliza al alto y ancho dados, Y desde 0", () => {
    const pts = sparklinePoints([0, 5, 10], 100, 20).split(" ");
    expect(pts[0]).toBe("0,20");
    expect(pts[2]).toBe("100,0");
  });
  it("serie vacía → cadena vacía", () => {
    expect(sparklinePoints([], 100, 20)).toBe("");
  });
});

describe("dateRange", () => {
  it("incluye ambos extremos", () => {
    const r = dateRange(new Date("2026-08-01"), new Date("2026-08-03"));
    expect(r).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
  });
});
