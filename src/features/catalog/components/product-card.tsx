// Glass — tarjeta de producto del catálogo (§8.2). Server Component, sin JS.
// Precio y existencia salen de la consulta cacheada de la grilla (§7.1); la
// separación fina estático/dinámico vive en la ficha de producto.
import Image from "next/image";
import Link from "next/link";
import { formatBob } from "@/domain/money";
import type { ProductCardData } from "@/features/catalog/types";
import {
  CARD_PRESETS,
  type CardPreset,
  type CardPresetName,
} from "@/theme/card-presets";

function cardVars(p: CardPreset): React.CSSProperties {
  return {
    "--ratio-media": p.ratio,
    "--radius-card": p.radius,
    "--price-weight": String(p.priceWeight),
  } as React.CSSProperties;
}

const STOCK_STYLE: Record<ProductCardData["stock"]["kind"], string> = {
  in: "text-emerald-700",
  available: "text-emerald-700",
  low: "text-amber-700",
  out: "text-black/40",
};

export function ProductCard({
  product,
  preset,
}: {
  product: ProductCardData;
  preset: CardPresetName;
}) {
  const p = CARD_PRESETS[preset];
  const row = p.layout === "row";
  const discounted = product.effectiveFromPriceBob < product.fromPriceBob;

  return (
    <Link
      href={`/producto/${product.slug}`}
      style={cardVars(p)}
      className={[
        "group flex gap-3",
        row ? "flex-row items-center" : "flex-col",
        p.framed ? "border border-black/10 bg-white p-2.5" : "bg-transparent",
      ].join(" ")}
    >
      <div
        className="relative shrink-0 overflow-hidden bg-black/5"
        style={{
          aspectRatio: "var(--ratio-media)",
          borderRadius: "var(--radius-card)",
          width: row ? 112 : "100%",
        }}
      >
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            unoptimized
            sizes={
              row
                ? "112px"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            }
            className={`object-cover ${product.stock.available ? "" : "opacity-50"}`}
            placeholder={product.image.blurDataUrl ? "blur" : "empty"}
            blurDataURL={product.image.blurDataUrl ?? undefined}
          />
        ) : null}
      </div>

      <div className={`flex min-w-0 flex-col gap-1 ${row ? "flex-1" : ""}`}>
        <h3 className="line-clamp-2 text-sm text-black/80 group-hover:text-black">
          {product.name}
        </h3>

        <div className="flex flex-wrap items-baseline gap-x-2">
          {product.variantCount > 1 && (
            <span className="text-xs text-black/50">Desde</span>
          )}
          <span style={{ fontWeight: "var(--price-weight, 600)" }}>
            {formatBob(product.effectiveFromPriceBob)}
          </span>
          {discounted && (
            <>
              <span className="text-sm text-black/40 line-through">
                {formatBob(product.fromPriceBob)}
              </span>
              {product.discountLabel && (
                <span className="rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--on-brand)]">
                  {product.discountLabel}
                </span>
              )}
            </>
          )}
        </div>

        <span
          className={`text-xs font-medium ${STOCK_STYLE[product.stock.kind]}`}
        >
          {product.stock.text}
        </span>
      </div>
    </Link>
  );
}
