import type { Metadata } from "next";
import { requireInventory } from "@/features/auth/roles";
import { EntryForm } from "@/features/inventory/components/entry-form";

export const metadata: Metadata = { title: "Ingreso de mercadería" };
export const instant = false;

export default async function IngresoPage() {
  await requireInventory();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Ingreso de mercadería
      </h1>
      <p className="text-sm text-muted-foreground">
        Escaneá cada producto que llega. Si el código no existe, lo creás en el
        momento con nombre y precio.
      </p>
      <EntryForm />
    </div>
  );
}
