// Glass — lecturas del catálogo. Lo cacheable lleva `use cache` + `cacheTag`
// (§7.1, §10.2); el precio y la disponibilidad exactos NO se cachean (ver
// pricing-view.ts / stock-view.ts).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { publicImageUrl } from "./image";
import { queryCatalogList } from "./list-query";
import type {
  CatalogFilters,
  CatalogPage,
  CatalogSort,
  CategoryNode,
  ProductCardData,
  ProductDetail,
} from "./types";

const PAGE_SIZE = 24;

export async function getCategoryTree(): Promise<CategoryNode[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");

  const cats = await prisma.category.findMany({
    where: { archivedAt: null },
    orderBy: { position: "asc" },
    select: { id: true, slug: true, name: true, parentId: true },
  });

  const parents = cats.filter((c) => c.parentId === null);
  return parents.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    children: cats
      .filter((c) => c.parentId === p.id)
      .map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
  }));
}

async function resolveCategoryIds(
  slug: string | undefined,
): Promise<string[] | null> {
  if (!slug) return null;
  const cat = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, children: { select: { id: true } } },
  });
  if (!cat) return ["__none__"]; // categoría inexistente → 0 resultados
  return [cat.id, ...cat.children.map((c) => c.id)];
}

export async function getCatalogPage(input: {
  categorySlug?: string;
  filters?: CatalogFilters;
  sort?: CatalogSort;
  page?: number;
}): Promise<CatalogPage> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes"); // el stock/descuento de la grilla se auto-refresca

  const [categoryIds, settings] = await Promise.all([
    resolveCategoryIds(input.categorySlug),
    getSiteSettings(),
  ]);
  return queryCatalogList({
    categoryIds,
    filters: input.filters ?? {},
    sort: input.sort ?? "featured",
    page: Math.max(1, input.page ?? 1),
    pageSize: PAGE_SIZE,
    stockDisplay: settings.stockDisplay,
    lowStockThreshold: settings.lowStockThreshold,
  });
}

/** Búsqueda (§7.3). NO se cachea: resultados por petición. */
export async function getSearchResults(input: {
  q: string;
  filters?: CatalogFilters;
  page?: number;
}): Promise<CatalogPage> {
  const settings = await getSiteSettings();
  return queryCatalogList({
    categoryIds: null,
    filters: input.filters ?? {},
    sort: "featured",
    page: Math.max(1, input.page ?? 1),
    pageSize: PAGE_SIZE,
    search: input.q,
    stockDisplay: settings.stockDisplay,
    lowStockThreshold: settings.lowStockThreshold,
  });
}

export async function getFeatured(limit = 8): Promise<ProductCardData[]> {
  "use cache";
  cacheTag("featured");
  cacheLife("minutes");

  const settings = await getSiteSettings();
  const { products } = await queryCatalogList({
    categoryIds: null,
    filters: {},
    sort: "featured",
    page: 1,
    pageSize: limit,
    stockDisplay: settings.stockDisplay,
    lowStockThreshold: settings.lowStockThreshold,
  });
  return products;
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("hours");

  const p = await prisma.product.findFirst({
    where: { slug, isActive: true, archivedAt: null },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { where: { archivedAt: null }, orderBy: { position: "asc" } },
      categories: {
        include: {
          category: {
            include: { parent: { select: { slug: true, name: true } } },
          },
        },
      },
    },
  });
  if (!p) return null;

  cacheTag(`product:${p.id}`);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    images: p.images.map((img) => ({
      url: publicImageUrl(img.path),
      alt: img.alt ?? p.name,
      blurDataUrl: img.blurDataUrl,
    })),
    categories: p.categories.map((pc) => ({
      slug: pc.category.slug,
      name: pc.category.name,
      parentSlug: pc.category.parent?.slug ?? null,
      parentName: pc.category.parent?.name ?? null,
    })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      attributes: (v.attributes as Record<string, string> | null) ?? null,
      basePriceBob: v.basePriceBob,
    })),
  };
}

/** Slugs para `generateStaticParams` — los primeros N por orden de alta. */
export async function getStaticProductSlugs(limit = 100): Promise<string[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: { id: "asc" },
    take: limit,
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/** Redirección 301 cuando cambia un slug (§20.2). */
export async function resolveSlugRedirect(
  slug: string,
): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const hit = await prisma.slugHistory.findUnique({
    where: { entity_oldSlug: { entity: "product", oldSlug: slug } },
  });
  return hit?.newSlug ?? null;
}
