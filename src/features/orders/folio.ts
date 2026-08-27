import "server-only";
import type { Prisma } from "@prisma/client";

/** Folio secuencial P-000001. Reintenta ante colisión (volumen bajo). */
export async function nextOrderFolio(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const count = await tx.order.count();
  for (let i = 0; i < 20; i++) {
    const folio = `P-${String(count + 1 + i).padStart(6, "0")}`;
    const taken = await tx.order.findUnique({
      where: { folio },
      select: { id: true },
    });
    if (!taken) return folio;
  }
  return `P-${Date.now()}`;
}
