// Glass — derivación de tokens en OKLCH (§10.2). Pura y probada.
// Los tokens se emiten como variables CSS en el layout raíz; Tailwind las consume.
// No hay compilación por cliente: la misma imagen sirve a doce comercios.

import { formatCss, oklch, wcagContrast } from "culori";
import { PRESETS, type PresetName } from "./presets";

export interface Oklch {
  /** Luminosidad 0–1. */
  l: number;
  /** Croma 0–~0.4. */
  c: number;
  /** Tono 0–360. */
  h: number;
}

/** Interpreta el color de marca guardado en `site_settings` (cualquier CSS válido). */
export function parseBrandColor(input: string): Oklch {
  const parsed = oklch(input);
  if (!parsed || parsed.l === undefined) {
    return { l: 0.62, c: 0.17, h: 25 }; // rojo teja por defecto
  }
  return { l: parsed.l, c: parsed.c ?? 0.1, h: parsed.h ?? 0 };
}

export type Tokens = Record<string, string>;

interface RampOptions {
  steps: number;
  minL: number;
  maxL: number;
}

/** OKLCH → cadena CSS. Tolera que `formatCss` devuelva `undefined` en los tipos. */
function css(l: number, c: number, h: number): string {
  return formatCss({ mode: "oklch", l, c, h }) ?? `oklch(${l} ${c} ${h})`;
}

/**
 * Rampa de luminosidad de `steps` pasos, del más claro (índice 0) al más oscuro.
 * El croma se atenúa hacia los extremos para que los tonos muy claros u oscuros
 * no salgan sobresaturados.
 */
export function rampOklch(brand: Oklch, opts: RampOptions): string[] {
  const { steps, minL, maxL } = opts;
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1); // 0 → claro, 1 → oscuro
    const l = maxL - t * (maxL - minL);
    const taper = 1 - Math.abs(2 * t - 1) ** 1.4; // 0 en extremos, 1 en el medio
    const c = Math.max(0, brand.c * (0.35 + 0.65 * taper));
    return css(l, c, brand.h);
  });
}

/** Devuelve el candidato con mejor contraste WCAG contra `bg`. */
export function bestContrast(bg: string, candidates: string[]): string {
  let best = candidates[0];
  let bestRatio = -1;
  for (const candidate of candidates) {
    const ratio = wcagContrast(bg, candidate);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }
  return best;
}

export function contrastRatio(a: string, b: string): number {
  return wcagContrast(a, b);
}

const NEAR_WHITE = "oklch(0.985 0 0)";
const NEAR_BLACK = "oklch(0.15 0 0)";
const AA = 4.5;

/**
 * Elige el paso de la rampa que servirá de relleno de marca: el primero (en
 * orden de preferencia hacia el medio) cuyo mejor contraste con negro o blanco
 * llega a AA. Siempre existe: los extremos de la rampa contrastan de sobra.
 */
function pickBrandFill(scale: string[]): { fill: string; onBrand: string } {
  for (const i of [6, 7, 5, 8, 4, 9, 3, 10, 2, 1, 0]) {
    const fill = scale[i];
    const onBrand = bestContrast(fill, [NEAR_WHITE, NEAR_BLACK]);
    if (contrastRatio(fill, onBrand) >= AA) return { fill, onBrand };
  }
  // Inalcanzable en la práctica; red de seguridad.
  return { fill: scale[10], onBrand: NEAR_WHITE };
}

/**
 * Deriva el conjunto completo de tokens a partir de un color de marca y un preset.
 * `--on-brand` cumple contraste AA por construcción.
 */
export function deriveTokens(brand: Oklch, preset: PresetName): Tokens {
  const p = PRESETS[preset];
  const scale = rampOklch(brand, { steps: 11, minL: 0.14, maxL: 0.97 });

  const surface = p.dark
    ? css(0.16, 0.006, brand.h)
    : css(0.99, 0.004, brand.h);
  const ink = p.dark ? scale[1] : scale[10];
  const { fill: brandFill, onBrand } = pickBrandFill(scale);

  const tokens: Tokens = {
    "--brand-1": scale[0],
    "--brand-2": scale[1],
    "--brand-3": scale[2],
    "--brand-4": scale[3],
    "--brand-5": scale[4],
    "--brand-6": scale[5],
    "--brand-7": scale[6],
    "--brand-8": scale[7],
    "--brand-9": scale[8],
    "--brand-10": scale[9],
    "--brand-11": scale[10],
    "--surface": surface,
    "--ink": ink,
    "--brand": brandFill,
    "--on-brand": onBrand,
    "--radius-card": p.radius,
    "--ratio-media": p.ratio,
    "--font-display": p.fontDisplay,
    "--font-body": p.fontBody,
  };

  return tokens;
}

/** Serializa los tokens a un bloque CSS para inyectar en <style>. */
export function tokensToCss(tokens: Tokens, selector = ":root"): string {
  const body = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}
