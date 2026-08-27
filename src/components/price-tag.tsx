// Glass — precio efectivo. Server Component dinámico: se monta dentro de
// <Suspense> y se lee en cada petición (§7.1).
import { connection } from "next/server";
import { getDisplayPrice } from "@/catalog/pricing-view";
import { formatBob } from "@/domain/money";

export async function PriceTag({
  productId,
  size = "sm",
}: {
  productId: string;
  size?: "sm" | "lg";
}) {
  await connection();
  const price = await getDisplayPrice(productId);
  if (!price) return null;

  const big = size === "lg";
  const value = price.hasDiscount
    ? price.effectiveFromPriceBob
    : price.fromPriceBob;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {!price.singleVariant && (
        <span className="text-xs text-black/50">Desde</span>
      )}
      <span
        className={big ? "text-2xl font-bold tracking-tight" : "font-semibold"}
        style={{ fontWeight: "var(--price-weight, 600)" }}
      >
        {formatBob(value)}
      </span>
      {price.hasDiscount && (
        <>
          <span
            className={`text-black/40 line-through ${big ? "text-base" : "text-sm"}`}
          >
            {formatBob(price.fromPriceBob)}
          </span>
          {price.discountLabel && (
            <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-semibold text-[var(--on-brand)]">
              {price.discountLabel}
            </span>
          )}
        </>
      )}
    </div>
  );
}
