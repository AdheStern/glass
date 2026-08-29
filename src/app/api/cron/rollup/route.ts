// Glass — refresco nocturno de los agregados diarios (§18.3). Lo dispara el cron
// externo (Coolify) con `Authorization: Bearer $CRON_SECRET`. Refresca una
// ventana de 3 días para incorporar sincronizaciones offline tardías.
import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { prisma } from "@/db/client";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  await connection();
  if (!authorized(request)) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }
  const rows = await prisma.$queryRawUnsafe<{ glass_refresh_rollup: number }[]>(
    "SELECT glass_refresh_rollup(current_date - 3, current_date)",
  );
  return Response.json({
    ok: true,
    refreshed: rows[0]?.glass_refresh_rollup ?? 0,
  });
}
