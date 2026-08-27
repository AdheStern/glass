import type { Metadata } from "next";
import { getSiteSettings } from "@/db/settings";
import { requirePanel } from "@/features/auth/roles";
import { SettingsForm } from "@/features/settings/components/settings-form";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const s = await getSiteSettings();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      <p className="text-sm text-muted-foreground">
        La apariencia (colores, tipografía) se configura en una fase posterior.
      </p>
      <SettingsForm
        initial={{
          name: s.name,
          whatsappNumbers: s.whatsappNumbers,
          minOrderBob: s.minOrderBob,
          orderMessageTemplate: s.orderMessageTemplate,
          hours: s.hours,
        }}
      />
    </div>
  );
}
