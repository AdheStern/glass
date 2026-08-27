// Glass — insignia de disponibilidad (§7.2). Dinámica, dentro de <Suspense>.
import { connection } from "next/server";
import { getStockView, type StockKind } from "@/catalog/stock-view";

const STYLE: Record<StockKind, string> = {
  in: "bg-emerald-50 text-emerald-700",
  available: "bg-emerald-50 text-emerald-700",
  low: "bg-amber-50 text-amber-700",
  out: "bg-black/5 text-black/50",
};

export async function StockBadge({ productId }: { productId: string }) {
  await connection();
  const stock = await getStockView(productId);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[stock.kind]}`}
    >
      {stock.text}
    </span>
  );
}
