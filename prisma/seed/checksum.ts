// Glass — huella determinista de la siembra: si la semilla no cambia, esto no cambia.
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export async function seedChecksum(prisma: PrismaClient): Promise<string> {
  const sales = await prisma.sale.findMany({
    select: { folio: true, totalBob: true, roundingBob: true },
    orderBy: { folio: "asc" },
  });
  const orders = await prisma.order.findMany({
    select: { folio: true, totalBob: true },
    orderBy: { folio: "asc" },
  });

  const h = createHash("sha256");
  for (const s of sales)
    h.update(`${s.folio}:${s.totalBob}:${s.roundingBob}\n`);
  for (const o of orders) h.update(`${o.folio}:${o.totalBob}\n`);
  return h.digest("hex");
}
