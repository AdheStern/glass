import { describe, expect, it } from "vitest";
import {
  code128,
  ean13,
  ean13CheckDigit,
  internalBarcode,
  isHidBurst,
} from "./barcode";

describe("code128 (juego B)", () => {
  it('calcula el checksum módulo 103 de "CODE128" (= 26)', () => {
    const bc = code128("CODE128");
    // START_B(6) + 7 símbolos * 6 = 48; el checksum ocupa los índices 48-53.
    expect(bc.bars.slice(0, 6)).toEqual([2, 1, 1, 2, 1, 4]); // START B
    expect(bc.bars.slice(48, 54)).toEqual([3, 2, 1, 2, 2, 1]); // patrón del valor 26
    expect(bc.bars.slice(-7)).toEqual([2, 3, 3, 1, 1, 1, 2]); // STOP
    expect(bc.modules).toBe(112);
    expect(bc.text).toBe("CODE128");
  });

  it("rechaza caracteres fuera del juego B", () => {
    expect(() => code128("caña\u{1F600}")).toThrow();
  });
});

describe("ean13", () => {
  it("calcula el dígito de control", () => {
    expect(ean13CheckDigit("400638133393")).toBe(1);
  });

  it("completa 12 dígitos y valida 13", () => {
    expect(ean13("400638133393").text).toBe("4006381333931");
    expect(ean13("4006381333931").text).toBe("4006381333931");
    expect(() => ean13("4006381333939")).toThrow();
  });

  it("el símbolo empieza y termina con la guarda 101", () => {
    const bc = ean13("400638133393");
    expect(bc.bars.slice(0, 3)).toEqual([1, 1, 1]); // 1,0,1 → runs de 1
    expect(bc.modules).toBe(95);
  });
});

describe("internalBarcode", () => {
  it("da VIT-{base36} en mayúsculas y es estable", () => {
    expect(internalBarcode(0)).toBe("VIT-0");
    expect(internalBarcode(1295)).toBe("VIT-ZZ");
    expect(internalBarcode("clv123")).toBe(internalBarcode("clv123"));
    expect(internalBarcode("clv123")).toMatch(/^VIT-[0-9A-Z]+$/);
  });
});

describe("isHidBurst (§15.1)", () => {
  it("una ráfaga rápida y larga es un lector", () => {
    expect(isHidBurst([12, 9, 14, 11])).toBe(true);
  });
  it("el tipeo humano no lo es", () => {
    expect(isHidBurst([120, 90, 140])).toBe(false);
    expect(isHidBurst([10, 9, 250])).toBe(false);
    expect(isHidBurst([8, 9])).toBe(false); // muy corto
  });
});
