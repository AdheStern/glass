import "server-only";
import { prisma } from "@/db/client";

export interface TrackedOrder {
  folio: string;
  status: string;
  createdAt: Date;
  customerName: string | null;
  note: string | null;
  subtotalBob: number;
  discountBob: number;
  totalBob: number;
  items: {
    nameSnapshot: string;
    productSlug: string | null;
    qty: number;
    unitPriceBob: number;
    listPriceBob: number;
    note: string | null;
  }[];
}

export async function getOrderByFolio(
  folio: string,
): Promise<TrackedOrder | null> {
  const o = await prisma.order.findUnique({
    where: { folio },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!o) return null;
  return {
    folio: o.folio,
    status: o.status,
    createdAt: o.createdAt,
    customerName: o.customerName,
    note: o.note,
    subtotalBob: o.subtotalBob,
    discountBob: o.discountBob,
    totalBob: o.totalBob,
    items: o.items.map((i) => ({
      nameSnapshot: i.nameSnapshot,
      productSlug: i.productSlug,
      qty: i.qty,
      unitPriceBob: i.unitPriceBob,
      listPriceBob: i.listPriceBob,
      note: i.note,
    })),
  };
}

export interface BoardOrder {
  id: string;
  folio: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  itemCount: number;
  totalBob: number;
  createdAt: Date;
  statusChangedAt: Date;
  ageHours: number;
}

export async function listOrdersForBoard(
  search?: string,
): Promise<BoardOrder[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const q = search?.trim();

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: { in: ["NUEVO", "CONFIRMADO", "PREPARADO"] } },
        { status: "ENTREGADO", statusChangedAt: { gte: startOfDay } },
      ],
      ...(q
        ? {
            AND: {
              OR: [
                { folio: { contains: q, mode: "insensitive" as const } },
                { customerPhone: { contains: q } },
                { customerName: { contains: q, mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
    take: 200,
  });

  const now = Date.now();
  return orders.map((o) => ({
    id: o.id,
    folio: o.folio,
    status: o.status,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    itemCount: o._count.items,
    totalBob: o.totalBob,
    createdAt: o.createdAt,
    statusChangedAt: o.statusChangedAt,
    ageHours: (now - o.createdAt.getTime()) / 3_600_000,
  }));
}
