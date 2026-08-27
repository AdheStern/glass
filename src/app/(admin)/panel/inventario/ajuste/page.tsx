import type { Metadata } from "next";
import { requireInventory } from "@/features/auth/roles";
import { AdjustmentForm } from "@/features/inventory/components/adjustment-form";

export const metadata: Metadata = { title: "Ajuste / merma" };
export const instant = false;

export default async function AjustePage() {
  await requireInventory();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Ajuste / merma</h1>
      <p className="text-sm text-muted-foreground">
        Una merma resta existencias (roto, vencido, robo). Un ajuste corrige en
        cualquier sentido. Ambos exigen nota.
      </p>
      <AdjustmentForm />
    </div>
  );
}
