// Glass — recibe la cola de comandos de una tablet sin conexión (§17.1).
import { connection, type NextRequest, NextResponse } from "next/server";
import { runBatch } from "@/features/pos/sync-batch";

export async function POST(req: NextRequest) {
  await connection();
  const token = req.headers.get("x-pos-device-token") ?? "";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }
  const { status, body: out } = await runBatch(token, body);
  return NextResponse.json(out, { status });
}
