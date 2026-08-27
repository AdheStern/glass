import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireInventory } from "@/features/auth/roles";
import { AlertsPanel } from "@/features/inventory/components/alerts-panel";
import { LedgerTable } from "@/features/inventory/components/ledger-table";

export const metadata: Metadata = { title: "Inventario" };
export const instant = false;

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; variantId?: string; page?: string }>;
}) {
  await requireInventory();
  const sp = await searchParams;
  const filter = {
    kind: sp.kind,
    variantId: sp.variantId,
    page: sp.page ? Number(sp.page) : 1,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/panel/inventario/ingreso">Ingreso</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/panel/inventario/ajuste">Ajuste / merma</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/panel/inventario/tomas">Tomas</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/panel/inventario/reposicion">Reposición</Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-40" />}>
        <AlertsPanel />
      </Suspense>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Libro de movimientos
        </h2>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <LedgerTable filter={filter} />
        </Suspense>
      </section>
    </div>
  );
}
