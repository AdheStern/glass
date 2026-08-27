import "server-only";
import { prisma } from "@/db/client";
import {
  type DiscountInput,
  resolveBestPrice,
} from "@/features/catalog/discount";

export interface VariantPricing {
  variantId: string;
  productId: string;
  productName: string;
  slug: string;
  variantLabel: string | null;
  basePriceBob: number;
  effectiveBob: number;
  stockQty: number;
}

/** Precio efectivo por variante + existencia, para congelar en el pedido (§9.2). */
export async function getVariantPricing(
  variantIds: string[],
): Promise<Map<string, VariantPricing>> {
  const ids = [...new Set(variantIds)];
  if (ids.length === 0) return new Map();

  const variants = await prisma.variant.findMany({
    where: { id: { in: ids }, archivedAt: null },
    select: {
      id: true,
      basePriceBob: true,
      attributes: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          archivedAt: true,
          categories: { select: { categoryId: true } },
        },
      },
      stock: { select: { qty: true } },
    },
  });

  const discounts = await prisma.$queryRaw<
    {
      product_id: string | null;
      category_id: string | null;
      scope: string;
      percent: number | null;
      amount_bob: number | null;
    }[]
  >`
    select dp."B" as product_id, d.category_id, d.scope, d.percent, d.amount_bob
    from discount d
    left join "_DiscountToProduct" dp on dp."A" = d.id
    where d.is_active = true and d.archived_at is null
      and (d.starts_at is null or d.starts_at <= now())
      and (d.ends_at is null or d.ends_at >= now())
  `;

  const out = new Map<string, VariantPricing>();
  for (const v of variants) {
    if (!v.product.isActive || v.product.archivedAt) continue;
    const catIds = new Set(v.product.categories.map((c) => c.categoryId));
    const applicable: DiscountInput[] = discounts
      .filter(
        (d) =>
          d.scope === "GLOBAL" ||
          (d.scope === "PRODUCT" && d.product_id === v.product.id) ||
          (d.scope === "CATEGORY" &&
            d.category_id &&
            catIds.has(d.category_id)),
      )
      .map((d) => ({ percent: d.percent, amountBob: d.amount_bob }));

    const best = resolveBestPrice(v.basePriceBob, applicable);
    const attrs = (v.attributes as Record<string, string> | null) ?? null;
    out.set(v.id, {
      variantId: v.id,
      productId: v.product.id,
      productName: v.product.name,
      slug: v.product.slug,
      variantLabel: attrs?.variante ?? null,
      basePriceBob: v.basePriceBob,
      effectiveBob: best.effectiveBob,
      stockQty: v.stock?.qty ?? 0,
    });
  }
  return out;
}
