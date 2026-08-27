"use server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";

const SettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  whatsappNumbers: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        e164: z
          .string()
          .trim()
          .regex(/^\+?\d{7,15}$/, "Número inválido"),
      }),
    )
    .max(8),
  minOrderBs: z.coerce.number().min(0).optional(),
  orderMessageTemplate: z.string().trim().max(500).optional().or(z.literal("")),
  hours: z.record(z.string(), z.string().trim().max(60)),
});

export type SettingsInput = z.input<typeof SettingsSchema>;

export async function saveSettingsAction(
  raw: SettingsInput,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  const parsed = SettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const d = parsed.data;

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      name: d.name,
      whatsappNumbers: d.whatsappNumbers.map((n) => ({
        label: n.label,
        e164: n.e164.startsWith("+") ? n.e164 : `+${n.e164}`,
      })),
      minOrderBob: d.minOrderBs ? Math.round(d.minOrderBs * 100) : null,
      orderMessageTemplate: d.orderMessageTemplate || null,
      hours: Object.fromEntries(
        Object.entries(d.hours).filter(([, v]) => v.trim()),
      ),
    },
    create: {
      id: "singleton",
      name: d.name,
      themePreset: "MERCADO",
      brandColor: "oklch(0.62 0.17 25)",
      cardPreset: "SUAVE",
      density: "COMODA",
      homeLayout: "HERO",
      whatsappNumbers: d.whatsappNumbers,
      minOrderBob: d.minOrderBs ? Math.round(d.minOrderBs * 100) : null,
      orderMessageTemplate: d.orderMessageTemplate || null,
      hours: d.hours,
    },
  });

  revalidateTag("settings", "max");
  return { ok: true };
}
