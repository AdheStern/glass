// Glass — paquete inicial para operar sin conexión (§17.3).
import { connection, type NextRequest, NextResponse } from "next/server";
import { requireDevice } from "@/features/pos/device";
import { buildSyncPackage } from "@/features/pos/sync-package";

export async function GET(req: NextRequest) {
  await connection();
  const token = req.headers.get("x-pos-device-token") ?? "";
  let device: Awaited<ReturnType<typeof requireDevice>>;
  try {
    device = await requireDevice(token);
  } catch {
    return NextResponse.json(
      { error: "dispositivo no reconocido" },
      { status: 401 },
    );
  }
  const pkg = await buildSyncPackage();
  return NextResponse.json({
    ...pkg,
    deviceId: device.id,
    deviceLastSeq: device.lastAppliedSeq,
  });
}
