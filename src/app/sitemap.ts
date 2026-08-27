import type { MetadataRoute } from "next";
import { prisma } from "@/db/client";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, archivedAt: null },
      select: { slug: true, createdAt: true },
      orderBy: { id: "asc" },
      take: 5000,
    }),
    prisma.category.findMany({
      where: { archivedAt: null },
      select: { slug: true },
    }),
  ]);

  return [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}/catalogo`, priority: 0.9 },
    ...categories.map((c) => ({
      url: `${SITE_URL}/catalogo/${c.slug}`,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/producto/${p.slug}`,
      lastModified: p.createdAt,
      priority: 0.6,
    })),
  ];
}
