// Glass — shell del catálogo (estático) + resultados en <Suspense> (dinámico).
import { Suspense } from "react";
import type { SearchParams } from "@/catalog/params";
import { getCategoryTree } from "@/catalog/queries";
import { getSiteSettings } from "@/db/settings";
import { resolveCardPresetName } from "@/theme/card-presets";
import { CatalogResults } from "./catalog-results";
import { CategoryNav } from "./category-nav";
import { GridSkeleton } from "./skeletons";

export async function CatalogView({
  heading,
  mode,
  basePath,
  categorySlug,
  activeSlug,
  searchParams,
}: {
  heading: string;
  mode: "catalog" | "search";
  basePath: string;
  categorySlug?: string;
  activeSlug?: string;
  searchParams: Promise<SearchParams>;
}) {
  const [tree, settings] = await Promise.all([
    getCategoryTree(),
    getSiteSettings(),
  ]);
  const cardPreset = resolveCardPresetName(settings.cardPreset);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">{heading}</h1>
      <CategoryNav tree={tree} activeSlug={activeSlug} />
      <Suspense
        fallback={
          <div className="mt-8">
            <GridSkeleton />
          </div>
        }
      >
        <CatalogResults
          mode={mode}
          basePath={basePath}
          categorySlug={categorySlug}
          searchParams={searchParams}
          cardPreset={cardPreset}
        />
      </Suspense>
    </div>
  );
}
