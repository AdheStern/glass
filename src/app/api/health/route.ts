// Glass — healthcheck para el contenedor y para Coolify.
import { NextResponse } from "next/server";
import { prisma } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  return NextResponse.json(
    { ok: true, db, ts: new Date().toISOString() },
    { status: db ? 200 : 503 },
  );
}
