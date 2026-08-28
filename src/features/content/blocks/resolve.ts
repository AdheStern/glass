import "server-only";
// Glass — resuelve el contenido dinámico de un bloque (productos, entradas). Se
// cachea con `catalog` + `content` para refrescarse cuando cambian.
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { queryCatalogList } from "@/features/catalog/list-query";
import { getFeatured } from "@/features/catalog/queries";
import type { ProductCardData } from "@/features/catalog/types";
import { getLatestPosts } from "../queries";
import type { PostCard } from "../types";
import { PostsData, ProductGridData } from "./schemas";

export interface ResolvedGrid {
  title: string;
  products: ProductCardData[];
}

export async function resolveGrid(raw: unknown): Promise<ResolvedGrid> {
  "use cache";
  cacheTag("catalog");
  cacheTag("content");
  cacheLife("minutes");

  const d = ProductGridData.parse(raw);
  const settings = await getSiteSettings();
  const base = {
    filters: {},
    sort: "featured" as const,
    page: 1,
    pageSize: d.limit,
    stockDisplay: settings.stockDisplay,
    lowStockThreshold: settings.lowStockThreshold,
  };

  if (d.mode === "featured") {
    return { title: d.title, products: await getFeatured(d.limit) };
  }
  if (d.mode === "manual") {
    if (d.productIds.length === 0) return { title: d.title, products: [] };
    const { products } = await queryCatalogList({
      categoryIds: null,
      productIds: d.productIds,
      ...base,
    });
    return { title: d.title, products };
  }
  if (d.mode === "discounted") {
    const { products } = await queryCatalogList({
      categoryIds: null,
      ...base,
      filters: { discounted: true },
    });
    return { title: d.title, products };
  }

  // category
  const cat = d.categorySlug
    ? await prisma.category.findUnique({
        where: { slug: d.categorySlug },
        select: { id: true, children: { select: { id: true } } },
      })
    : null;
  const categoryIds = cat
    ? [cat.id, ...cat.children.map((c) => c.id)]
    : ["__none__"];
  const { products } = await queryCatalogList({ categoryIds, ...base });
  return { title: d.title, products };
}

export async function resolvePosts(
  raw: unknown,
): Promise<{ title: string; posts: PostCard[] }> {
  const d = PostsData.parse(raw);
  return { title: d.title, posts: await getLatestPosts(d.limit) };
}
