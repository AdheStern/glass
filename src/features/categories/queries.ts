import "server-only";
import { prisma } from "@/db/client";

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  children: Omit<CategoryTreeNode, "children">[];
}

export async function listCategoryTree(): Promise<CategoryTreeNode[]> {
  const [cats, counts] = await Promise.all([
    prisma.category.findMany({
      where: { archivedAt: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    prisma.productCategory.groupBy({
      by: ["categoryId"],
      _count: { productId: true },
    }),
  ]);

  const countBy = new Map(
    counts.map((c) => [c.categoryId, c._count.productId]),
  );
  const node = (c: (typeof cats)[number]) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: countBy.get(c.id) ?? 0,
  });

  return cats
    .filter((c) => !c.parentId)
    .map((p) => ({
      ...node(p),
      children: cats.filter((c) => c.parentId === p.id).map(node),
    }));
}

export async function listParentOptions() {
  const parents = await prisma.category.findMany({
    where: { archivedAt: null, parentId: null },
    orderBy: { position: "asc" },
    select: { id: true, name: true },
  });
  return parents;
}
