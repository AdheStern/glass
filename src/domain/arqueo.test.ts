import { describe, expect, it } from "vitest";
import {
  canCashierDiscount,
  changeDue,
  computeArqueo,
  needsDifferenceNote,
} from "./arqueo";

describe("changeDue", () => {
  it("da el vuelto y nunca baja de cero", () => {
    expect(changeDue(66500, 70000)).toBe(3500);
    expect(changeDue(66500, 66500)).toBe(0);
    expect(changeDue(66500, 50000)).toBe(0);
  });
});

describe("computeArqueo (§16.2)", () => {
  it("esperado = fondo + ventas efectivo + ingresos − salidas", () => {
    // CANON-ARQ: fondo 20000 + 145030 efectivo + 5000 ingreso − 12000 salidas
    const r = computeArqueo({
      openingBob: 20000,
      cashSalesBob: 145030,
      cashInsBob: 5000,
      cashOutsBob: 12000,
      countedBob: 156480,
    });
    expect(r.expectedBob).toBe(158030);
    expect(r.differenceBob).toBe(-1550);
  });

  it("una caja que cuadra da diferencia cero", () => {
    const r = computeArqueo({
      openingBob: 20000,
      cashSalesBob: 0,
      cashInsBob: 0,
      cashOutsBob: 0,
      countedBob: 20000,
    });
    expect(r).toEqual({ expectedBob: 20000, differenceBob: 0 });
  });
});

describe("needsDifferenceNote", () => {
  it("pide nota solo por encima del umbral", () => {
    expect(needsDifferenceNote(-1550, 500)).toBe(true);
    expect(needsDifferenceNote(300, 500)).toBe(false);
    expect(needsDifferenceNote(-500, 500)).toBe(false);
  });
});

describe("canCashierDiscount (§13.2, §6.4)", () => {
  it("con tope 0 cualquier descuento pide PIN", () => {
    expect(canCashierDiscount(1, 0)).toBe(false);
    expect(canCashierDiscount(0, 0)).toBe(true);
  });
  it("respeta el tope configurado", () => {
    expect(canCashierDiscount(5, 10)).toBe(true);
    expect(canCashierDiscount(15, 10)).toBe(false);
  });
});
