// Glass — grilla UNIFORME del catálogo (§8.1: el catálogo no es bento).
import type { ProductCardData } from "@/features/catalog/types";
import type { CardPresetName } from "@/theme/card-presets";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  preset,
}: {
  products: ProductCardData[];
  preset: CardPresetName;
}) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-black/50">
        No hay productos que coincidan.
      </p>
    );
  }

  // La tarjeta COMPACTA es una fila horizontal: menos columnas. El resto sigue
  // la densidad del sitio (variables CSS, §10.1).
  if (preset === "COMPACTA") {
    return (
      <div className="grid grid-cols-1 gap-[var(--grid-gap)] sm:grid-cols-2">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} preset={preset} />
        ))}
      </div>
    );
  }

  return (
    <div className="catalog-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} preset={preset} />
      ))}
    </div>
  );
}
