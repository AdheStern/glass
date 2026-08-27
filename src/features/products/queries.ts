// Glass — lecturas de productos para el panel. Datos frescos (sin caché).
import "server-only";
import { prisma } from "@/db/client";

const PAGE_SIZE = 20;

export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  variantCount: number;
  fromPriceBob: number | null;
  stockQty: number;
  categories: string[];
}

export async function listProducts(input: {
  q?: string;
  page?: number;
}): Promise<{
  rows: AdminProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, input.page ?? 1);
  const q = input.q?.trim();

  const where = {
    archivedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { variants: { some: { barcode: { contains: q } } } },
            {
              variants: {
                some: { sku: { contains: q, mode: "insensitive" as const } },
              },
            },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        variants: {
          where: { archivedAt: null },
          select: { basePriceBob: true, stock: { select: { qty: true } } },
        },
        categories: { include: { category: { select: { name: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const rows: AdminProductRow[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    isActive: p.isActive,
    variantCount: p.variants.length,
    fromPriceBob: p.variants.length
      ? Math.min(...p.variants.map((v) => v.basePriceBob))
      : null,
    stockQty: p.variants.reduce((s, v) => s + (v.stock?.qty ?? 0), 0),
    categories: p.categories.map((c) => c.category.name),
  }));

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getProductForEdit(id: string) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { where: { archivedAt: null }, orderBy: { position: "asc" } },
      categories: { select: { categoryId: true } },
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!p || p.archivedAt) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? "",
    isActive: p.isActive,
    trackStock: p.trackStock,
    categoryIds: p.categories.map((c) => c.categoryId),
    images: p.images.map((i) => ({
      id: i.id,
      path: i.path,
      alt: i.alt,
      blurDataUrl: i.blurDataUrl,
    })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku ?? "",
      barcode: v.barcode ?? "",
      attributes: (v.attributes as Record<string, string> | null) ?? undefined,
      basePriceBob: v.basePriceBob,
      costBob: v.costBob ?? undefined,
      minStock: v.minStock,
    })),
  };
}

export async function listAllCategories() {
  const cats = await prisma.category.findMany({
    where: { archivedAt: null },
    orderBy: [{ parentId: "asc" }, { position: "asc" }],
    select: { id: true, name: true, parentId: true },
  });
  const parents = cats.filter((c) => !c.parentId);
  return parents.flatMap((p) => [
    { id: p.id, name: p.name, depth: 0 },
    ...cats
      .filter((c) => c.parentId === p.id)
      .map((c) => ({ id: c.id, name: c.name, depth: 1 })),
  ]);
}
