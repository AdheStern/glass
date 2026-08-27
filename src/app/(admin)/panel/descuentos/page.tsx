import type { Metadata } from "next";
import { requirePanel } from "@/features/auth/roles";
import { loadDiscountForEditAction } from "@/features/discounts/actions";
import { DiscountManager } from "@/features/discounts/components/discount-manager";
import { listDiscounts } from "@/features/discounts/queries";
import { listAllCategories } from "@/features/products/queries";

export const metadata: Metadata = { title: "Descuentos" };

export default async function DescuentosPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const [rows, categories] = await Promise.all([
    listDiscounts(),
    listAllCategories(),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Descuentos</h1>
      <p className="text-sm text-muted-foreground">
        No se acumulan: si a un producto le aplican dos, gana el de mayor
        beneficio (§13.2).
      </p>
      <DiscountManager
        rows={rows}
        categories={categories.map((c) => ({
          id: c.id,
          name: `${c.depth ? "— " : ""}${c.name}`,
        }))}
        loadForEdit={loadDiscountForEditAction}
      />
    </div>
  );
}
