// Glass — formas de tarjeta del catálogo (§8.2). Distintas de los "temas base"
// (MERCADO/NOCTURNO en ./presets.ts): esto controla solo la tarjeta de producto.

export type CardPresetName = "NITIDA" | "SUAVE" | "EDITORIAL" | "COMPACTA";

export interface CardPreset {
  /** Proporción de la imagen (CSS `aspect-ratio`). */
  ratio: string;
  /** Radio de la tarjeta. */
  radius: string;
  /** Sombra (clase utilitaria o valor CSS). */
  shadow: string;
  /** Peso tipográfico del precio. */
  priceWeight: 500 | 600 | 700 | 800;
  /** Disposición: `stack` = imagen arriba, `row` = imagen a la izquierda. */
  layout: "stack" | "row";
  /** ¿La tarjeta tiene recuadro visible? (EDITORIAL no). */
  framed: boolean;
}

export const CARD_PRESETS: Record<CardPresetName, CardPreset> = {
  NITIDA: {
    ratio: "1 / 1",
    radius: "0px",
    shadow: "none",
    priceWeight: 700,
    layout: "stack",
    framed: true,
  },
  SUAVE: {
    ratio: "4 / 5",
    radius: "16px",
    shadow: "0 1px 3px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04)",
    priceWeight: 600,
    layout: "stack",
    framed: true,
  },
  EDITORIAL: {
    ratio: "4 / 5",
    radius: "0px",
    shadow: "none",
    priceWeight: 500,
    layout: "stack",
    framed: false,
  },
  COMPACTA: {
    ratio: "1 / 1",
    radius: "10px",
    shadow: "none",
    priceWeight: 600,
    layout: "row",
    framed: true,
  },
};

export const CARD_PRESET_NAMES = Object.keys(CARD_PRESETS) as CardPresetName[];

export function resolveCardPreset(name: string): CardPreset {
  return CARD_PRESETS[
    (name as CardPresetName) in CARD_PRESETS
      ? (name as CardPresetName)
      : "SUAVE"
  ];
}

export function resolveCardPresetName(name: string): CardPresetName {
  return (name as CardPresetName) in CARD_PRESETS
    ? (name as CardPresetName)
    : "SUAVE";
}
