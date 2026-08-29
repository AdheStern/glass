// Glass — presets de tema (§10.1). El "tema base" fija de una vez tipografía,
// escala, densidad, forma de tarjeta y disposición de portada; el resto lo
// deriva `deriveTokens` a partir del color de marca.

import { CARD_PRESET_NAMES, type CardPresetName } from "./card-presets";

export type PresetName =
  | "MERCADO"
  | "BOUTIQUE"
  | "TALLER"
  | "SABOR"
  | "FARMACIA"
  | "ESTUDIO"
  | "NOCTURNO"
  | "PAPEL";

/** Disposición de la portada por defecto (§10.1). */
export type HomeLayoutName =
  | "HERO"
  | "BENTO"
  | "CAROUSEL"
  | "DIRECTO"
  | "EDITORIAL";

export const HOME_LAYOUT_NAMES: HomeLayoutName[] = [
  "HERO",
  "BENTO",
  "CAROUSEL",
  "DIRECTO",
  "EDITORIAL",
];

// ---------------------------------------------------------------------------
// Pares tipográficos (§10.1) — 6 combinaciones curadas. Se sirven localmente
// (src/theme/fonts.ts, next/font/local); estas cadenas apuntan a las variables
// CSS que ese módulo define, con una pila de sistema de respaldo.
// ---------------------------------------------------------------------------

export type FontPairName =
  | "GROTESK"
  | "EDITORIAL"
  | "TECH"
  | "SOLID"
  | "HUMANIST"
  | "READERLY";

interface FontPair {
  display: string;
  body: string;
}

const SANS = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const SERIF = "Georgia, Cambria, Times New Roman, serif";

export const FONT_PAIRS: Record<FontPairName, FontPair> = {
  GROTESK: {
    display: `var(--font-bricolage-grotesque), ${SANS}`,
    body: `var(--font-source-sans-3), ${SANS}`,
  },
  EDITORIAL: {
    display: `var(--font-fraunces), ${SERIF}`,
    body: `var(--font-inter), ${SANS}`,
  },
  TECH: {
    display: `var(--font-space-grotesk), ${SANS}`,
    body: `var(--font-inter), ${SANS}`,
  },
  SOLID: {
    display: `var(--font-archivo), ${SANS}`,
    body: `var(--font-archivo), ${SANS}`,
  },
  HUMANIST: {
    display: `var(--font-manrope), ${SANS}`,
    body: `var(--font-manrope), ${SANS}`,
  },
  READERLY: {
    display: `var(--font-newsreader), ${SERIF}`,
    body: `var(--font-nunito-sans), ${SANS}`,
  },
};

// ---------------------------------------------------------------------------

export interface Preset {
  /** Radio de las tarjetas del catálogo. */
  radius: string;
  /** Proporción de la imagen de producto (§8.2). */
  ratio: string;
  /** Densidad por defecto. */
  density: "COMODA" | "COMPACTA";
  /** ¿El preset invierte superficie/tinta? (tema oscuro). */
  dark: boolean;
  /** Par tipográfico (clave de `FONT_PAIRS`). */
  fontPair: FontPairName;
  /** Familia de títulos (variable CSS + respaldo de sistema). */
  fontDisplay: string;
  /** Familia de cuerpo. */
  fontBody: string;
  /** Forma de tarjeta por defecto (§8.2). */
  cardPreset: CardPresetName;
  /** Disposición de portada por defecto (§10.1). */
  homeLayout: HomeLayoutName;
}

function preset(
  fontPair: FontPairName,
  rest: Omit<Preset, "fontPair" | "fontDisplay" | "fontBody">,
): Preset {
  return {
    ...rest,
    fontPair,
    fontDisplay: FONT_PAIRS[fontPair].display,
    fontBody: FONT_PAIRS[fontPair].body,
  };
}

export const PRESETS: Record<PresetName, Preset> = {
  MERCADO: preset("GROTESK", {
    radius: "10px",
    ratio: "1 / 1",
    density: "COMODA",
    dark: false,
    cardPreset: "SUAVE",
    homeLayout: "HERO",
  }),
  BOUTIQUE: preset("EDITORIAL", {
    radius: "2px",
    ratio: "4 / 5",
    density: "COMODA",
    dark: false,
    cardPreset: "EDITORIAL",
    homeLayout: "EDITORIAL",
  }),
  TALLER: preset("TECH", {
    radius: "0px",
    ratio: "1 / 1",
    density: "COMPACTA",
    dark: false,
    cardPreset: "NITIDA",
    homeLayout: "DIRECTO",
  }),
  SABOR: preset("SOLID", {
    radius: "14px",
    ratio: "1 / 1",
    density: "COMPACTA",
    dark: false,
    cardPreset: "COMPACTA",
    homeLayout: "CAROUSEL",
  }),
  FARMACIA: preset("HUMANIST", {
    radius: "8px",
    ratio: "1 / 1",
    density: "COMODA",
    dark: false,
    cardPreset: "NITIDA",
    homeLayout: "DIRECTO",
  }),
  ESTUDIO: preset("HUMANIST", {
    radius: "4px",
    ratio: "4 / 5",
    density: "COMODA",
    dark: false,
    cardPreset: "EDITORIAL",
    homeLayout: "BENTO",
  }),
  NOCTURNO: preset("TECH", {
    radius: "14px",
    ratio: "4 / 5",
    density: "COMPACTA",
    dark: true,
    cardPreset: "SUAVE",
    homeLayout: "BENTO",
  }),
  PAPEL: preset("READERLY", {
    radius: "2px",
    ratio: "4 / 5",
    density: "COMODA",
    dark: false,
    cardPreset: "EDITORIAL",
    homeLayout: "EDITORIAL",
  }),
};

export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];

/** Etiqueta en español para la interfaz del editor de apariencia. */
export const PRESET_LABELS: Record<PresetName, string> = {
  MERCADO: "Mercado",
  BOUTIQUE: "Boutique",
  TALLER: "Taller",
  SABOR: "Sabor",
  FARMACIA: "Farmacia",
  ESTUDIO: "Estudio",
  NOCTURNO: "Nocturno",
  PAPEL: "Papel",
};

export function resolvePresetName(value: string): PresetName {
  return (value as PresetName) in PRESETS ? (value as PresetName) : "MERCADO";
}

export function resolveHomeLayoutName(value: string): HomeLayoutName {
  return HOME_LAYOUT_NAMES.includes(value as HomeLayoutName)
    ? (value as HomeLayoutName)
    : "HERO";
}

/** Re-export para que el editor valide sin importar de dos módulos. */
export { CARD_PRESET_NAMES };
