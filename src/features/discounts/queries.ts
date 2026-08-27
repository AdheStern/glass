import "server-only";
import { prisma } from "@/db/client";
import { formatBob } from "@/domain/money";

export interface DiscountRow {
  id: string;
  name: string;
  scope: string;
  value: string;
  target: string;
  window: string;
  isActive: boolean;
}

function windowText(startsAt: Date | null, endsAt: Date | null): string {
  const f = (d: Date) => d.toLocaleDateString("es-BO");
  if (!startsAt && !endsAt) return "Siempre";
  if (startsAt && endsAt) return `${f(startsAt)} – ${f(endsAt)}`;
  return startsAt ? `Desde ${f(startsAt)}` : `Hasta ${f(endsAt as Date)}`;
}

export async function listDiscounts(): Promise<DiscountRow[]> {
  const rows = await prisma.discount.findMany({
    where: { archivedAt: null },
    orderBy: { isActive: "desc" },
    include: {
      category: { select: { name: true } },
      _count: { select: { products: true } },
    },
  });

  return rows.map((d) => ({
    id: d.id,
    name: d.name,
    scope:
      d.scope === "GLOBAL"
        ? "Todo el catálogo"
        : d.scope === "CATEGORY"
          ? "Categoría"
          : "Productos",
    value:
      d.percent != null ? `−${d.percent}%` : `−${formatBob(d.amountBob ?? 0)}`,
    target:
      d.scope === "CATEGORY"
        ? (d.category?.name ?? "—")
        : d.scope === "PRODUCT"
          ? `${d._count.products} producto(s)`
          : "—",
    window: windowText(d.startsAt, d.endsAt),
    isActive: d.isActive,
  }));
}

export async function getDiscountForEdit(id: string) {
  const d = await prisma.discount.findUnique({
    where: { id },
    include: {
      products: { select: { variants: { select: { sku: true }, take: 1 } } },
    },
  });
  if (!d || d.archivedAt) return null;
  return {
    id: d.id,
    name: d.name,
    scope: d.scope,
    kind: (d.percent != null ? "PERCENT" : "AMOUNT") as "PERCENT" | "AMOUNT",
    percent: d.percent ?? undefined,
    amountBs: d.amountBob != null ? d.amountBob / 100 : undefined,
    categoryId: d.categoryId,
    isActive: d.isActive,
    startsAt: d.startsAt?.toISOString().slice(0, 10),
    endsAt: d.endsAt?.toISOString().slice(0, 10),
  };
}
