import "server-only";
import { prisma } from "@/db/client";
import { type ArqueoResult, computeArqueo } from "@/domain/arqueo";

/** Suma el efectivo del turno (ventas que cuentan en cajón + ingresos − salidas)
 *  y devuelve el arqueo contra el conteo declarado (§16.2). */
export async function computeSessionArqueo(
  sessionId: string,
  countedBob: number,
): Promise<ArqueoResult> {
  const session = await prisma.cashSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      sales: {
        where: { voidedAt: null },
        select: {
          payments: {
            include: { method: { select: { countsInDrawer: true } } },
          },
        },
      },
      cashMovements: { select: { kind: true, amountBob: true } },
    },
  });

  let cashSalesBob = 0;
  for (const sale of session.sales) {
    for (const p of sale.payments) {
      if (p.method.countsInDrawer) cashSalesBob += p.amountBob;
    }
  }
  let cashInsBob = 0;
  let cashOutsBob = 0;
  for (const m of session.cashMovements) {
    if (m.kind === "INGRESO") cashInsBob += m.amountBob;
    else cashOutsBob += m.amountBob;
  }

  return computeArqueo({
    openingBob: session.openingBob,
    cashSalesBob,
    cashInsBob,
    cashOutsBob,
    countedBob,
  });
}
