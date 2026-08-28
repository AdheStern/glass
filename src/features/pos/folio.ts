import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** Siguiente número de folio de venta (V-000001), a partir del mayor existente. */
export async function nextSaleFolioNumber(db: Db): Promise<number> {
  const last = await db.sale.findFirst({
    where: { folio: { startsWith: "V-" } },
    orderBy: { folio: "desc" },
    select: { folio: true },
  });
  return last ? Number.parseInt(last.folio.slice(2), 10) + 1 : 1;
}

/** Siguiente `seq` para un dispositivo (índice único deviceId+seq). */
export async function nextDeviceSeq(db: Db, deviceId: string): Promise<number> {
  const last = await db.sale.aggregate({
    where: { deviceId },
    _max: { seq: true },
  });
  return (last._max.seq ?? 0) + 1;
}
