import type { Metadata } from "next";
import { PreviewBridge } from "@/features/catalog/components/preview-bridge";
import { DefaultHome } from "@/features/content/components/default-home";
import { resolveCardPresetName } from "@/theme/card-presets";
import { resolveHomeLayoutName, resolvePresetName } from "@/theme/presets";
import { buildPreviewCss } from "@/theme/preview";

// Solo la usa el editor de apariencia dentro de un iframe (§10.3). Fuera del índice.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppearancePreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";

  const preset = resolvePresetName(get("preset"));
  const card = resolveCardPresetName(get("card"));
  const home = resolveHomeLayoutName(get("home"));
  const density = get("density") === "COMPACTA" ? "COMPACTA" : "COMODA";
  const brandColor = get("color") || "oklch(0.62 0.17 25)";

  const css = buildPreviewCss({ brandColor, preset, density });

  return (
    <div data-density={density}>
      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: CSS derivado, sin entrada de terceros
        dangerouslySetInnerHTML={{ __html: css }}
      />
      <PreviewBridge />
      <DefaultHome layout={home} cardPreset={card} />
    </div>
  );
}
