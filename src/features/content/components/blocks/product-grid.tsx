import { getSiteSettings } from "@/db/settings";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { resolveCardPresetName } from "@/theme/card-presets";
import { resolveGrid } from "../../blocks/resolve";

export async function ProductGridBlock({ data }: { data: unknown }) {
  const [{ title, products }, settings] = await Promise.all([
    resolveGrid(data),
    getSiteSettings(),
  ]);
  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      {title && (
        <h2 className="mb-4 text-2xl font-bold tracking-tight">{title}</h2>
      )}
      <ProductGrid
        products={products}
        preset={resolveCardPresetName(settings.cardPreset)}
      />
    </section>
  );
}
