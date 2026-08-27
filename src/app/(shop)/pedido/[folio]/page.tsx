import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBob } from "@/domain/money";
import { getOrderByFolio } from "@/features/orders/queries";
import { type OrderStatus, STATUS_LABEL } from "@/features/orders/schemas";

export const metadata: Metadata = { robots: { index: false } };

// El estado del pedido cambia; la página es dinámica y puede bloquear.
export const instant = false;

const STEPS: OrderStatus[] = ["NUEVO", "CONFIRMADO", "PREPARADO", "ENTREGADO"];

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = await params;
  const order = await getOrderByFolio(decodeURIComponent(folio));
  if (!order) notFound();

  const cancelled = order.status === "CANCELADO";
  const currentStep = STEPS.indexOf(order.status as OrderStatus);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Pedido {order.folio}
        </h1>
        <Badge variant={cancelled ? "destructive" : "secondary"}>
          {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
        </Badge>
      </div>
      <p className="mb-6 text-sm text-black/50">
        {order.createdAt.toLocaleString("es-BO")}
        {order.customerName ? ` · ${order.customerName}` : ""}
      </p>

      {!cancelled && (
        <ol className="mb-6 flex gap-2">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`flex-1 rounded-md border p-2 text-center text-xs ${
                i <= currentStep
                  ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--on-brand)]"
                  : "text-black/40"
              }`}
            >
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ol>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {order.items.map((it) => (
            <div
              key={`${it.nameSnapshot}-${it.qty}`}
              className="flex justify-between gap-3 text-sm"
            >
              <span>
                {it.qty}×{" "}
                {it.productSlug ? (
                  <Link
                    href={`/producto/${it.productSlug}`}
                    className="hover:underline"
                  >
                    {it.nameSnapshot}
                  </Link>
                ) : (
                  it.nameSnapshot
                )}
                {it.note ? (
                  <span className="block text-black/50">— {it.note}</span>
                ) : null}
              </span>
              <span className="tabular-nums">
                {formatBob(it.unitPriceBob * it.qty)}
                {it.listPriceBob > it.unitPriceBob && (
                  <span className="ml-1 text-black/40 line-through">
                    {formatBob(it.listPriceBob * it.qty)}
                  </span>
                )}
              </span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatBob(order.totalBob)}</span>
          </div>
          {order.note && (
            <p className="text-sm text-black/60">Nota: {order.note}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
