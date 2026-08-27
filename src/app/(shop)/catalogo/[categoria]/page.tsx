import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SearchParams } from "@/catalog/params";
import { getCategoryTree } from "@/catalog/queries";
import { CatalogView } from "@/components/catalog-view";

type Params = { categoria: string };

async function findCategory(slug: string) {
  const tree = await getCategoryTree();
  return (
    tree.find((c) => c.slug === slug) ??
    tree.flatMap((c) => c.children).find((c) => c.slug === slug) ??
    null
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { categoria } = await params;
  const cat = await findCategory(categoria);
  return {
    title: cat ? cat.name : "Categoría",
    description: cat ? `Productos de ${cat.name}.` : undefined,
  };
}

export async function generateStaticParams() {
  const tree = await getCategoryTree();
  return tree.map((c) => ({ categoria: c.slug }));
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { categoria } = await params;
  const cat = await findCategory(categoria);
  if (!cat) notFound();

  return (
    <CatalogView
      heading={cat.name}
      mode="catalog"
      basePath={`/catalogo/${categoria}`}
      categorySlug={categoria}
      activeSlug={categoria}
      searchParams={searchParams}
    />
  );
}
