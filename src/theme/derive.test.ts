import { describe, expect, it } from "vitest";
import { bestContrast, contrastRatio, deriveTokens, rampOklch } from "./derive";
import { PRESET_NAMES } from "./presets";

const SAMPLE_BRANDS = [
  { l: 0.55, c: 0.18, h: 25 }, // rojo teja
  { l: 0.6, c: 0.13, h: 150 }, // verde
  { l: 0.5, c: 0.2, h: 285 }, // violeta
  { l: 0.7, c: 0.15, h: 90 }, // amarillo
];

describe("rampOklch", () => {
  it("produce la cantidad de pasos pedida, del claro al oscuro", () => {
    const scale = rampOklch(SAMPLE_BRANDS[0], { steps: 11, minL: 0.14, maxL: 0.97 });
    expect(scale).toHaveLength(11);
    expect(scale[0]).toContain("oklch");
  });
});

describe("bestContrast", () => {
  it("elige el candidato de mayor contraste", () => {
    const pick = bestContrast("oklch(0.2 0.05 260)", ["oklch(0.25 0 0)", "oklch(0.98 0 0)"]);
    expect(pick).toBe("oklch(0.98 0 0)");
  });
});

describe("deriveTokens", () => {
  it("--on-brand cumple contraste AA para todo color de marca y preset", () => {
    for (const preset of PRESET_NAMES) {
      for (const brand of SAMPLE_BRANDS) {
        const tokens = deriveTokens(brand, preset);
        const ratio = contrastRatio(tokens["--brand"], tokens["--on-brand"]);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("emite los 11 pasos de marca y los tokens de forma", () => {
    const tokens = deriveTokens(SAMPLE_BRANDS[0], "MERCADO");
    expect(tokens["--brand-1"]).toBeDefined();
    expect(tokens["--brand-11"]).toBeDefined();
    expect(tokens["--radius-card"]).toBe("10px");
    expect(tokens["--ratio-media"]).toBe("1 / 1");
  });
});
