// Glass — healthcheck para el contenedor y para Coolify.
import { connection, NextResponse } from "next/server";
import { prisma } from "@/db/client";

export async function GET() {
  await connection(); // lectura fresca en cada petición (Cache Components)

  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  return NextResponse.json({ ok: true, db }, { status: db ? 200 : 503 });
}
