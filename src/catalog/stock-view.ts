// Glass — lectura de existencias para la FICHA (§7.2). NO se cachea: va en
// streaming dentro de <Suspense>. La lógica pura vive en ./stock-label.
import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { labelFor, type StockView } from "./stock-label";

export type { StockKind, StockView } from "./stock-label";
export { labelFor } from "./stock-label";

export const getStockView = cache(
  async (productId: string): Promise<StockView> => {
    const settings = await getSiteSettings();
    const rows = await prisma.$queryRaw<{ qty: number }[]>`
    select coalesce(sum(sk.qty), 0)::int as qty
    from variant v
    left join variant_stock sk on sk.variant_id = v.id
    where v.product_id = ${productId} and v.archived_at is null
  `;
    const qty = rows[0]?.qty ?? 0;
    return labelFor(qty, settings.stockDisplay, settings.lowStockThreshold);
  },
);
