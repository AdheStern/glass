import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/db/client";

async function Counts() {
  await connection();
  const [products, categories, discounts, orders] = await Promise.all([
    prisma.product.count({ where: { archivedAt: null } }),
    prisma.category.count({ where: { archivedAt: null } }),
    prisma.discount.count({ where: { archivedAt: null, isActive: true } }),
    prisma.order.count({ where: { status: "NUEVO" } }),
  ]);

  const tiles = [
    { label: "Productos", value: products },
    { label: "Categorías", value: categories },
    { label: "Descuentos activos", value: discounts },
    { label: "Pedidos nuevos", value: orders },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold tabular-nums">
              {t.value.toLocaleString("es-BO")}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PanelResumenPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Resumen</h1>
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["a", "b", "c", "d"].map((k) => (
              <Skeleton key={k} className="h-28" />
            ))}
          </div>
        }
      >
        <Counts />
      </Suspense>
    </div>
  );
}
