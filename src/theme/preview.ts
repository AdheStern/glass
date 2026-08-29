// Glass — CSS de la vista previa del editor de apariencia (§10.3). Pura: la usa
// el servidor al render del iframe y el cliente en cada arrastre del color, para
// que ambos pinten exactamente lo mismo.
import { deriveTokens, parseBrandColor, tokensToCss } from "./derive";
import type { PresetName } from "./presets";

export interface PreviewOptions {
  brandColor: string;
  preset: PresetName;
  density: "COMODA" | "COMPACTA";
}

export function buildPreviewCss(opts: PreviewOptions): string {
  const tokens = deriveTokens(parseBrandColor(opts.brandColor), opts.preset);
  const grid =
    opts.density === "COMPACTA"
      ? { "--grid-gap": "0.5rem", "--grid-cols-lg": "5" }
      : { "--grid-gap": "1rem", "--grid-cols-lg": "4" };
  return tokensToCss({ ...tokens, ...grid });
}
