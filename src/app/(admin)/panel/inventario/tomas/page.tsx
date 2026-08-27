import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/db/client";
import { requireInventory } from "@/features/auth/roles";
import { NewCountForm } from "@/features/inventory/components/new-count-form";
import { listStockCounts } from "@/features/inventory/queries";

export const metadata: Metadata = { title: "Tomas de inventario" };
export const instant = false;

export default async function TomasPage() {
  await requireInventory();
  const [counts, categories] = await Promise.all([
    listStockCounts(),
    prisma.category.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Tomas de inventario</h1>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Nueva toma</h2>
        <NewCountForm categories={categories} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Historial
        </h2>
        {counts.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay tomas.</p>
        )}
        {counts.map((c) => (
          <Link
            key={c.id}
            href={`/panel/inventario/tomas/${c.id}`}
            className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
          >
            <span>
              {c.scope === "CATEGORIA" ? c.category?.name : c.scope} ·{" "}
              {c._count.lines} líneas
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {c.createdAt.toLocaleDateString("es-BO")}
              <Badge variant="secondary">{c.status}</Badge>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
