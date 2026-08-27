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

  const cols =
    preset === "COMPACTA"
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={`grid gap-4 ${cols}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} preset={preset} />
      ))}
    </div>
  );
}
