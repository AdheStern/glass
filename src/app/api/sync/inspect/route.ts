// Glass — inspección del estado de sincronización de un dispositivo. SOLO fuera
// de producción: la usa el recorrido 3 de §23.1 para verificar "exactamente seis
// ventas, sin duplicados" sin necesitar el panel (que exige Supabase).
import { connection, type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/client";

export async function GET(req: NextRequest) {
  await connection();
  if (process.env.NODE_ENV === "production" && !process.env.GLASS_E2E) {
    return NextResponse.json({ error: "no disponible" }, { status: 404 });
  }
  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? "";
  if (!deviceId) {
    return NextResponse.json({ error: "falta deviceId" }, { status: 400 });
  }

  const sales = await prisma.sale.findMany({
    where: { deviceId },
    orderBy: { seq: "asc" },
    select: {
      folio: true,
      seq: true,
      clientSaleId: true,
      totalBob: true,
      voidedAt: true,
    },
  });
  const saleIds = await prisma.sale
    .findMany({ where: { deviceId }, select: { id: true } })
    .then((r) => r.map((s) => s.id));
  const ventaMovements = await prisma.stockMovement.count({
    where: { kind: "VENTA", sourceType: "sale", sourceId: { in: saleIds } },
  });
  const clientIds = new Set(sales.map((s) => s.clientSaleId));

  return NextResponse.json({
    saleCount: sales.length,
    uniqueClientSaleIds: clientIds.size,
    ventaMovements,
    sales,
  });
}
