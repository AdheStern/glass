"use server";
// Glass — guardar la apariencia del comercio (§10). El editor (vista previa en
// vivo) manda aquí solo al pulsar "Guardar"; se invalida `settings` y `catalog`.
import { oklch } from "culori";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";
import { CARD_PRESET_NAMES } from "@/theme/card-presets";
import { HOME_LAYOUT_NAMES, PRESET_NAMES } from "@/theme/presets";

const AppearanceSchema = z.object({
  themePreset: z.enum(PRESET_NAMES as [string, ...string[]]),
  cardPreset: z.enum(CARD_PRESET_NAMES as [string, ...string[]]),
  density: z.enum(["COMODA", "COMPACTA"]),
  homeLayout: z.enum(HOME_LAYOUT_NAMES as [string, ...string[]]),
  brandColor: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .refine((v) => oklch(v) !== undefined, "Color de marca inválido"),
});

export type AppearanceInput = z.input<typeof AppearanceSchema>;

export async function saveAppearanceAction(
  raw: AppearanceInput,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  const parsed = AppearanceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const d = parsed.data;

  await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: {
      themePreset: d.themePreset,
      cardPreset: d.cardPreset,
      density: d.density,
      homeLayout: d.homeLayout,
      brandColor: d.brandColor,
    },
  });

  revalidateTag("settings", "max");
  revalidateTag("catalog", "max");
  return { ok: true };
}
