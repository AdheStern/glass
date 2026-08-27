import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { requireInventory } from "@/features/auth/roles";
import { getReorderList } from "@/features/inventory/queries";

export const metadata: Metadata = { title: "Lista de reposición" };
export const instant = false;

export default async function ReposicionPage() {
  await requireInventory();
  const rows = await getReorderList();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Lista de reposición
        </h1>
        {rows.length > 0 && (
          <Button asChild size="sm" variant="outline">
            <a href="/panel/inventario/reposicion/csv">Exportar CSV</a>
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Variantes con existencia igual o menor a su mínimo. La sugerencia lleva
        el stock al doble del mínimo.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Producto</th>
              <th className="p-2">SKU</th>
              <th className="p-2 text-right">Existencia</th>
              <th className="p-2 text-right">Mínimo</th>
              <th className="p-2 text-right">Sugerido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-muted-foreground"
                >
                  Nada por reponer.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.variantId}>
                <td className="p-2">{r.productName}</td>
                <td className="p-2 text-xs text-muted-foreground">
                  {r.sku ?? ""}
                </td>
                <td className="p-2 text-right tabular-nums">{r.qty}</td>
                <td className="p-2 text-right tabular-nums text-muted-foreground">
                  {r.minStock}
                </td>
                <td className="p-2 text-right font-medium tabular-nums">
                  {r.suggestedQty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
