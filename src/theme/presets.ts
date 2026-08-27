// Glass — presets de tema (§10.1). En la Fase 0 solo dos; los ocho son Fase 8.

export type PresetName = "MERCADO" | "NOCTURNO";

export interface Preset {
  /** Radio de las tarjetas del catálogo. */
  radius: string;
  /** Proporción de la imagen de producto (§8.2). */
  ratio: string;
  /** Densidad por defecto. */
  density: "COMODA" | "COMPACTA";
  /** ¿El preset invierte superficie/tinta? (tema oscuro). */
  dark: boolean;
  /** Par tipográfico (se sirve localmente, no desde Google Fonts). */
  fontDisplay: string;
  fontBody: string;
}

export const PRESETS: Record<PresetName, Preset> = {
  MERCADO: {
    radius: "10px",
    ratio: "1 / 1",
    density: "COMODA",
    dark: false,
    fontDisplay: "'Bricolage Grotesque', system-ui, sans-serif",
    fontBody: "'Source Sans 3', system-ui, sans-serif",
  },
  NOCTURNO: {
    radius: "14px",
    ratio: "4 / 5",
    density: "COMPACTA",
    dark: true,
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
  },
};

export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];
