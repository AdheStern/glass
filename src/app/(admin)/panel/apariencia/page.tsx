import type { Metadata } from "next";
import { getSiteSettings } from "@/db/settings";
import { requirePanel } from "@/features/auth/roles";
import {
  AppearanceEditor,
  type AppearanceValue,
} from "@/features/settings/components/appearance-editor";
import { resolveCardPresetName } from "@/theme/card-presets";
import { resolveHomeLayoutName, resolvePresetName } from "@/theme/presets";

export const metadata: Metadata = { title: "Apariencia" };

export default async function AparienciaPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const s = await getSiteSettings();

  const initial: AppearanceValue = {
    themePreset: resolvePresetName(s.themePreset),
    cardPreset: resolveCardPresetName(s.cardPreset),
    density: s.density,
    homeLayout: resolveHomeLayoutName(s.homeLayout),
    brandColor: s.brandColor,
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Apariencia</h1>
        <p className="text-sm text-muted-foreground">
          Elegís color y opciones curadas; el sistema deriva el resto y
          garantiza el contraste. La vista previa muestra tu catálogo real.
        </p>
      </div>
      <AppearanceEditor initial={initial} />
    </div>
  );
}
