import { describe, expect, it } from "vitest";
import { autoMap, parseMoneyBs } from "./schema";

describe("parseMoneyBs (§19.2 — precios tolerantes)", () => {
  it("acepta coma decimal con puntos de miles", () => {
    expect(parseMoneyBs("1.234,56")).toBe(123456);
  });
  it("acepta punto decimal", () => {
    expect(parseMoneyBs("1234.56")).toBe(123456);
  });
  it("acepta prefijo de moneda", () => {
    expect(parseMoneyBs("Bs 1.234,56")).toBe(123456);
    expect(parseMoneyBs("Bs. 45")).toBe(4500);
  });
  it("acepta coma de miles con punto decimal", () => {
    expect(parseMoneyBs("1,234.50")).toBe(123450);
  });
  it("entero simple", () => {
    expect(parseMoneyBs("310")).toBe(31000);
  });
  it("rechaza texto vacío o inválido", () => {
    expect(parseMoneyBs("")).toBeNull();
    expect(parseMoneyBs("gratis")).toBeNull();
    expect(parseMoneyBs("-5")).toBeNull();
  });
});

describe("autoMap", () => {
  it("reconoce encabezados comunes en español", () => {
    const m = autoMap([
      "Nombre",
      "Precio Venta",
      "Código de Barras",
      "Categoria",
      "otro",
    ]);
    expect(m.Nombre).toBe("name");
    expect(m["Precio Venta"]).toBe("priceBs");
    expect(m["Código de Barras"]).toBe("barcode");
    expect(m.Categoria).toBe("category");
    expect(m.otro).toBeNull();
  });
});
