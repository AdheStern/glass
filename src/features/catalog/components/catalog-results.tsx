// Glass — parte dinámica del catálogo: lee searchParams y consulta. Se monta
// dentro de <Suspense> para que el shell (cabecera, categorías) prerenderice y
// la grilla llegue en streaming (Cache Components / §7.1).
import {
  parseCatalogParams,
  type SearchParams,
} from "@/features/catalog/params";
import { getCatalogPage, getSearchResults } from "@/features/catalog/queries";
import type { CardPresetName } from "@/theme/card-presets";
import { FilterBar } from "./filter-bar";
import { Pagination } from "./pagination";
import { ProductGrid } from "./product-grid";

export async function CatalogResults({
  mode,
  basePath,
  categorySlug,
  searchParams,
  cardPreset,
}: {
  mode: "catalog" | "search";
  basePath: string;
  categorySlug?: string;
  searchParams: Promise<SearchParams>;
  cardPreset: CardPresetName;
}) {
  const sp = await searchParams;
  const parsed = parseCatalogParams(sp);

  const page =
    mode === "search"
      ? await getSearchResults({
          q: parsed.q,
          filters: parsed.filters,
          page: parsed.page,
        })
      : await getCatalogPage({
          categorySlug,
          filters: parsed.filters,
          sort: parsed.sort,
          page: parsed.page,
        });

  return (
    <>
      <div className="my-4">
        <FilterBar action={basePath} parsed={parsed} resultCount={page.total} />
      </div>
      <ProductGrid products={page.products} preset={cardPreset} />
      <Pagination
        base={basePath}
        current={sp}
        page={page.page}
        totalPages={page.totalPages}
      />
    </>
  );
}
