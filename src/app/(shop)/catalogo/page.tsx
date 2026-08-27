import type { Metadata } from "next";
import { CatalogView } from "@/features/catalog/components/catalog-view";
import type { SearchParams } from "@/features/catalog/params";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos los productos disponibles.",
};

export default function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CatalogView
      heading="Catálogo"
      mode="catalog"
      basePath="/catalogo"
      searchParams={searchParams}
    />
  );
}
