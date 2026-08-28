import { describe, expect, it } from "vitest";
import { BLOCKS, isBlockType, parseBlockData } from "./registry";
import { BLOCK_TYPES, HeroData, ProductGridData } from "./schemas";

describe("registro de bloques", () => {
  it("tiene los 10 tipos de §11.1 y todos con defaultData válido", () => {
    expect(BLOCK_TYPES).toHaveLength(10);
    for (const type of BLOCK_TYPES) {
      const def = BLOCKS[type];
      expect(def.label).toBeTruthy();
      expect(() => def.schema.parse(def.defaultData)).not.toThrow();
    }
  });

  it("isBlockType distingue tipos válidos", () => {
    expect(isBlockType("HERO")).toBe(true);
    expect(isBlockType("MARQUESINA")).toBe(false);
  });
});

describe("HERO", () => {
  it("recorta a 2 botones como máximo", () => {
    expect(() =>
      HeroData.parse({
        title: "x",
        buttons: [
          { label: "a", href: "/" },
          { label: "b", href: "/" },
          { label: "c", href: "/" },
        ],
      }),
    ).toThrow();
  });
  it("rellena variante y tipo de media por defecto", () => {
    const d = HeroData.parse({ title: "Hola" });
    expect(d.variant).toBe("center");
    expect(d.mediaKind).toBe("image");
    expect(d.buttons).toEqual([]);
  });
});

describe("PRODUCT_GRID", () => {
  it("limita el tope a 24", () => {
    expect(() => ProductGridData.parse({ limit: 99 })).toThrow();
  });
  it("modo por defecto = featured", () => {
    expect(parseBlockData("PRODUCT_GRID", {})).toMatchObject({
      mode: "featured",
      limit: 8,
    });
  });
});
