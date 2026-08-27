// Glass — precio efectivo a mostrar en la FICHA. NO se cachea (§7.1): se lee en
// cada petición dentro de <Suspense>. La grilla resuelve su precio en SQL.
import "server-only";
import { cache } from "react";
import { prisma } from "@/db/client";
import { type DiscountInput, resolveBestPrice } from "./discount";

interface ActiveDiscountRow {
  percent: number | null;
  amount_bob: number | null;
}

export interface DisplayPrice {
  fromPriceBob: number;
  effectiveFromPriceBob: number;
  hasDiscount: boolean;
  discountLabel: string | null;
  singleVariant: boolean;
}

export const getDisplayPrice = cache(
  async (productId: string): Promise<DisplayPrice | null> => {
    const [variants, rows] = await Promise.all([
      prisma.variant.findMany({
        where: { productId, archivedAt: null },
        select: { basePriceBob: true },
        orderBy: { basePriceBob: "asc" },
      }),
      prisma.$queryRaw<ActiveDiscountRow[]>`
        select d.percent, d.amount_bob
        from discount d
        where d.is_active = true and d.archived_at is null
          and (d.starts_at is null or d.starts_at <= now())
          and (d.ends_at is null or d.ends_at >= now())
          and (
            d.scope = 'GLOBAL'
            or (d.scope = 'PRODUCT' and exists (
              select 1 from "_DiscountToProduct" dp where dp."A" = d.id and dp."B" = ${productId}))
            or (d.scope = 'CATEGORY' and d.category_id in (
              select category_id from product_category where product_id = ${productId}))
          )
      `,
    ]);

    if (variants.length === 0) return null;

    const discounts: DiscountInput[] = rows.map((r) => ({
      percent: r.percent,
      amountBob: r.amount_bob,
    }));
    const bases = variants.map((v) => v.basePriceBob);
    const fromPriceBob = Math.min(...bases);

    let effectiveFromPriceBob = fromPriceBob;
    let discountLabel: string | null = null;
    for (const base of bases) {
      const best = resolveBestPrice(base, discounts);
      if (best.effectiveBob < effectiveFromPriceBob) {
        effectiveFromPriceBob = best.effectiveBob;
      }
      if (base === fromPriceBob) discountLabel = best.label;
    }

    return {
      fromPriceBob,
      effectiveFromPriceBob,
      hasDiscount: effectiveFromPriceBob < fromPriceBob,
      discountLabel:
        effectiveFromPriceBob < fromPriceBob ? discountLabel : null,
      singleVariant: variants.length === 1,
    };
  },
);
