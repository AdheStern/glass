import type { Metadata } from "next";
import { prisma } from "@/db/client";
import { requirePanel } from "@/features/auth/roles";
import { DevicesManager } from "@/features/pos/components/devices-manager";

export const metadata: Metadata = { title: "Dispositivos" };
export const instant = false;

export default async function DispositivosPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastSyncAt: true,
      revokedAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Dispositivos de caja
      </h1>
      <DevicesManager devices={devices} />
    </div>
  );
}
