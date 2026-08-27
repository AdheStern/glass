import type { Metadata } from "next";
import { requireInventory } from "@/features/auth/roles";
import { LabelsTray } from "@/features/labels/components/labels-tray";
import { getLabelQueue } from "@/features/labels/queries";

export const metadata: Metadata = { title: "Etiquetas" };
export const instant = false;

export default async function EtiquetasPage() {
  await requireInventory();
  const rows = await getLabelQueue();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Etiquetas</h1>
      <p className="text-sm text-muted-foreground">
        Variantes sin código de barras. Generá los códigos internos que falten y
        descargá el PDF por lote para imprimir sobre etiquetas adhesivas.
      </p>
      <LabelsTray rows={rows} />
    </div>
  );
}
