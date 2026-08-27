import type { Metadata } from "next";
import type { SearchParams } from "@/catalog/params";
import { CatalogView } from "@/components/catalog-view";

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
