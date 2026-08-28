// Glass — portada por defecto cuando el comercio no armó una con bloques.
import Link from "next/link";
import { getSiteSettings } from "@/db/settings";
import { CategoryNav } from "@/features/catalog/components/category-nav";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { getCategoryTree, getFeatured } from "@/features/catalog/queries";
import { resolveCardPresetName } from "@/theme/card-presets";

export async function DefaultHome() {
  const [settings, tree, featured] = await Promise.all([
    getSiteSettings(),
    getCategoryTree(),
    getFeatured(8),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="mb-8 rounded-2xl bg-[var(--brand)] px-6 py-12 text-[var(--on-brand)]">
        <p className="font-mono text-xs uppercase tracking-widest opacity-80">
          {settings.name}
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Todo para tu obra y tu casa, a un mensaje de distancia.
        </h1>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-lg bg-[var(--surface)] px-4 py-2 font-medium text-[var(--ink)]"
        >
          Ver catálogo
        </Link>
      </section>

      <div className="mb-6">
        <CategoryNav tree={tree} />
      </div>

      <h2 className="mb-4 text-xl font-bold tracking-tight">Destacados</h2>
      <ProductGrid
        products={featured}
        preset={resolveCardPresetName(settings.cardPreset)}
      />
    </div>
  );
}
