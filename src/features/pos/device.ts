import "server-only";
import type { Device } from "@prisma/client";
import { prisma } from "@/db/client";

export class PosAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PosAuthError";
  }
}

/** Toda action y query del POS empieza acá: token de dispositivo no revocado. */
export async function requireDevice(token: string): Promise<Device> {
  const device = token
    ? await prisma.device.findUnique({ where: { token } })
    : null;
  if (!device) throw new PosAuthError("dispositivo no reconocido");
  if (device.revokedAt) throw new PosAuthError("dispositivo revocado");
  return device;
}

/** Token opaco de 32 hex para un dispositivo nuevo. */
export function newDeviceToken(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
