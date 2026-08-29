// Glass — tipografías servidas localmente (§10.1: "no desde Google Fonts, menos
// latencia y sin dependencia externa"). Los `.woff2` son subconjuntos `latin-ext`
// de peso variable (ver ./fonts/LICENSE.md).
//
// Se declaran las 9 familias con `preload: false`: el navegador solo descarga
// las 2 que el par activo referencia vía `--font-display` / `--font-body`. Así el
// catálogo baja únicamente su par y el editor de apariencia previsualiza
// cualquier preset sin recargar.
//
// `next/font/local` es una macro del compilador: cada llamada tiene que recibir
// un objeto literal, no se puede factorizar en un helper.

import localFont from "next/font/local";
import { type FontPairName, PRESETS, type PresetName } from "./presets";

const bricolageGrotesque = localFont({
  src: "./fonts/bricolage-grotesque.woff2",
  variable: "--font-bricolage-grotesque",
  display: "swap",
  weight: "100 900",
  preload: false,
});
const sourceSans3 = localFont({
  src: "./fonts/source-sans-3.woff2",
  variable: "--font-source-sans-3",
  display: "swap",
  weight: "100 900",
  preload: false,
});
const fraunces = localFont({
  src: "./fonts/fraunces.woff2",
  variable: "--font-fraunces",
  display: "swap",
  weight: "100 900",
  preload: false,
});
const inter = localFont({
  src: "./fonts/inter.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  preload: false,
});
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk.woff2",
  variable: "--font-space-grotesk",
  display: "swap",
  weight: "100 900",
  preload: false,
});
const archivo = localFont({
  src: "./fonts/archivo.woff2",
  variable: "--font-archivo",
  display: "swap",
  weight: "100 900",
  preload: false,
});
const manrope = localFont({
  src: "./fonts/manrope.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "100 900",
  preload: false,
});
const newsreader = localFont({
  src: "./fonts/newsreader.woff2",
  variable: "--font-newsreader",
  display: "swap",
  weight: "100 900",
  preload: false,
});
const nunitoSans = localFont({
  src: "./fonts/nunito-sans.woff2",
  variable: "--font-nunito-sans",
  display: "swap",
  weight: "100 900",
  preload: false,
});

const BY_FAMILY = {
  "bricolage-grotesque": bricolageGrotesque,
  "source-sans-3": sourceSans3,
  fraunces,
  inter,
  "space-grotesk": spaceGrotesk,
  archivo,
  manrope,
  newsreader,
  "nunito-sans": nunitoSans,
} as const;

const PAIR_FAMILIES: Record<
  FontPairName,
  [keyof typeof BY_FAMILY, keyof typeof BY_FAMILY]
> = {
  GROTESK: ["bricolage-grotesque", "source-sans-3"],
  EDITORIAL: ["fraunces", "inter"],
  TECH: ["space-grotesk", "inter"],
  SOLID: ["archivo", "archivo"],
  HUMANIST: ["manrope", "manrope"],
  READERLY: ["newsreader", "nunito-sans"],
};

/** Clases `.variable` de las 2 familias del par activo del preset. */
export function fontVariablesFor(preset: PresetName): string {
  const [display, body] = PAIR_FAMILIES[PRESETS[preset].fontPair];
  return [
    ...new Set([BY_FAMILY[display].variable, BY_FAMILY[body].variable]),
  ].join(" ");
}

/** Todas las variables (la vista previa del editor salta entre pares). */
export function allFontVariables(): string {
  return Object.values(BY_FAMILY)
    .map((f) => f.variable)
    .join(" ");
}
