import type { Metadata } from "next";
import { requirePanel } from "@/features/auth/roles";
import { OrderBoard } from "@/features/orders/components/order-board";
import { listOrdersForBoard } from "@/features/orders/queries";

export const metadata: Metadata = { title: "Pedidos" };

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR", "CAJERO");
  const { q } = await searchParams;
  const orders = await listOrdersForBoard(q);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
      <OrderBoard orders={orders} query={q ?? ""} />
    </div>
  );
}
