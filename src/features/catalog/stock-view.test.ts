import { describe, expect, it } from "vitest";
import { labelFor } from "./stock-label";

describe("labelFor (§7.2 — los 3 modos de stockDisplay)", () => {
  it("agotado es agotado en cualquier modo", () => {
    for (const mode of ["EXACTO", "UMBRAL", "OCULTO"] as const) {
      const v = labelFor(0, mode, 5);
      expect(v.available).toBe(false);
      expect(v.text).toBe("Agotado");
    }
  });

  it("EXACTO muestra la cantidad", () => {
    expect(labelFor(7, "EXACTO", 5)).toMatchObject({
      text: "Quedan 7",
      qty: 7,
      available: true,
    });
  });

  it("UMBRAL: bajo el umbral avisa «últimas unidades»", () => {
    expect(labelFor(3, "UMBRAL", 5).text).toBe("Últimas unidades");
    expect(labelFor(20, "UMBRAL", 5).text).toBe("Disponible");
  });

  it("OCULTO solo dice disponible", () => {
    expect(labelFor(147, "OCULTO", 5)).toMatchObject({
      text: "Disponible",
      available: true,
    });
    expect(labelFor(147, "OCULTO", 5).qty).toBeUndefined();
  });
});
