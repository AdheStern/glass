import { describe, expect, it } from "vitest";
import {
  isEmptyRichText,
  type RichText,
  richTextToPlain,
  safeUrl,
  sanitizeRichText,
} from "./rich-text";

describe("safeUrl", () => {
  it("acepta navegación normal, rechaza esquemas peligrosos", () => {
    expect(safeUrl("https://glass.bo")).toBe("https://glass.bo");
    expect(safeUrl("/catalogo")).toBe("/catalogo");
    expect(safeUrl("mailto:hola@glass.bo")).toBe("mailto:hola@glass.bo");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html;base64,x")).toBeNull();
    expect(safeUrl("  ")).toBeNull();
    expect(safeUrl(42)).toBeNull();
  });
});

describe("sanitizeRichText (§11.1)", () => {
  it("mantiene párrafos, negrita, cursiva, enlaces y listas", () => {
    const dirty = [
      {
        type: "p",
        children: [
          { text: "Hola ", bold: true },
          { text: "mundo", italic: true, href: "https://glass.bo" },
        ],
      },
      { type: "ul", items: [[{ text: "uno" }], [{ text: "dos" }]] },
    ];
    expect(sanitizeRichText(dirty)).toEqual([
      {
        type: "p",
        children: [
          { text: "Hola ", bold: true },
          { text: "mundo", italic: true, href: "https://glass.bo" },
        ],
      },
      { type: "ul", items: [[{ text: "uno" }], [{ text: "dos" }]] },
    ]);
  });

  it("quita el href peligroso pero conserva el texto", () => {
    const out = sanitizeRichText([
      { type: "p", children: [{ text: "clic", href: "javascript:evil()" }] },
    ]);
    expect(out).toEqual([{ type: "p", children: [{ text: "clic" }] }]);
  });

  it("descarta tipos de nodo y marcas desconocidas", () => {
    const out = sanitizeRichText([
      { type: "script", children: [{ text: "x" }] },
      { type: "p", children: [{ text: "ok", color: "red", underline: true }] },
      { type: "p", children: [] },
    ]);
    expect(out).toEqual([{ type: "p", children: [{ text: "ok" }] }]);
  });

  it("entrada no-array → vacío", () => {
    expect(sanitizeRichText("hola")).toEqual([]);
    expect(sanitizeRichText(null)).toEqual([]);
  });
});

describe("richTextToPlain / isEmptyRichText", () => {
  const rt: RichText = [
    {
      type: "p",
      children: [{ text: "Somos " }, { text: "Glass", bold: true }],
    },
    { type: "ol", items: [[{ text: "a" }], [{ text: "b" }]] },
  ];
  it("aplana a texto para excerpt/meta", () => {
    expect(richTextToPlain(rt)).toBe("Somos Glass a b");
  });
  it("detecta vacío", () => {
    expect(isEmptyRichText([])).toBe(true);
    expect(isEmptyRichText([{ type: "p", children: [{ text: "  " }] }])).toBe(
      true,
    );
    expect(isEmptyRichText(rt)).toBe(false);
  });
});
