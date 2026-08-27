import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireInventory } from "@/features/auth/roles";
import { CountSheet } from "@/features/inventory/components/count-sheet";
import { getStockCount } from "@/features/inventory/queries";

export const metadata: Metadata = { title: "Toma de inventario" };
export const instant = false;

export default async function TomaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireInventory();
  const { id } = await params;
  const count = await getStockCount(id);
  if (!count) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Toma de inventario</h1>
      <CountSheet count={count} />
    </div>
  );
}
