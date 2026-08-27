import { describe, expect, it } from "vitest";
import { buildOrderMessage, waLink } from "./message";

const base = {
  siteName: "Ferretería Demo",
  siteUrl: "https://demo.bo",
  folio: "P-000184",
  totalBob: 66500,
};

describe("buildOrderMessage (§9.3)", () => {
  it("incluye folio, total, enlace y anota el descuento", () => {
    const msg = buildOrderMessage({
      ...base,
      items: [
        {
          qty: 2,
          nameSnapshot: "Taladro Bosch GSB 550",
          unitPriceBob: 31000,
          listPriceBob: 31000,
        },
        {
          qty: 1,
          nameSnapshot: "Broca 6mm (juego)",
          unitPriceBob: 4500,
          listPriceBob: 5300,
        },
      ],
    });
    expect(msg).toContain("Ferretería Demo");
    expect(msg).toContain("Pedido N.º P-000184");
    expect(msg).toContain("Total: Bs 665,00");
    expect(msg).toContain("https://demo.bo/pedido/P-000184");
    expect(msg).toContain("antes Bs 53,00");
  });

  it("resume cuando supera 15 líneas", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      qty: 1,
      nameSnapshot: `Artículo ${i}`,
      unitPriceBob: 1000,
      listPriceBob: 1000,
    }));
    const msg = buildOrderMessage({ ...base, items });
    expect(msg.split("\n").length).toBeLessThan(10);
    expect(msg).toContain("20 artículos");
    expect(msg).toContain("Detalle completo:");
  });

  it("usa la plantilla configurada", () => {
    const msg = buildOrderMessage({
      ...base,
      items: [
        { qty: 1, nameSnapshot: "X", unitPriceBob: 1000, listPriceBob: 1000 },
      ],
      template: "Buenas {nombreComercio}, pedido:",
    });
    expect(msg.startsWith("Buenas Ferretería Demo, pedido:")).toBe(true);
  });
});

describe("waLink", () => {
  it("arma el enlace wa.me con el teléfono limpio", () => {
    const url = waLink("+591 700 00000", "hola mundo");
    expect(url).toBe("https://wa.me/59170000000?text=hola%20mundo");
  });
});
