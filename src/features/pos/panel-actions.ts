"use server";
// Glass — gestión de dispositivos y operadores desde el panel (§6.2). Rol.
import { hash } from "@node-rs/argon2";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";

export interface PanelResult {
  ok: boolean;
  error?: string;
  code?: string;
  id?: string;
}

const PANEL = ["PROPIETARIO", "ADMINISTRADOR"] as const;

/** Código de emparejamiento de 6 dígitos, válido 10 minutos (§6.2). */
export async function generatePairingCodeAction(): Promise<PanelResult> {
  await requireRole(...PANEL);
  let code = "";
  for (let i = 0; i < 10; i++) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    const clash = await prisma.devicePairingCode.findUnique({
      where: { code },
    });
    if (!clash) break;
  }
  await prisma.devicePairingCode.create({
    data: { code, expiresAt: new Date(Date.now() + 10 * 60_000) },
  });
  return { ok: true, code };
}

export async function revokeDeviceAction(id: string): Promise<PanelResult> {
  const actor = await requireRole(...PANEL);
  await prisma.device.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      action: "device.revoke",
      entity: "device",
      entityId: id,
      actorType: "user",
      actorId: actor.id,
    },
  });
  return { ok: true };
}

const OperatorSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(60),
  role: z.enum(["PROPIETARIO", "ADMINISTRADOR", "EDITOR", "CAJERO", "ALMACEN"]),
  pin: z
    .string()
    .regex(/^\d{4}$/, "El PIN son 4 dígitos")
    .optional()
    .or(z.literal("")),
});

export async function saveOperatorAction(raw: unknown): Promise<PanelResult> {
  const actor = await requireRole(...PANEL);
  const parsed = OperatorSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { id, name, role, pin } = parsed.data;

  if (id) {
    await prisma.operator.update({
      where: { id },
      data: {
        name,
        role,
        ...(pin
          ? { pinHash: await hash(pin), pinAttempts: 0, pinLockedUntil: null }
          : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "operator.update",
        entity: "operator",
        entityId: id,
        actorType: "user",
        actorId: actor.id,
        after: { name, role },
      },
    });
    return { ok: true, id };
  }

  if (!pin)
    return { ok: false, error: "El PIN es obligatorio para un operador nuevo" };
  const op = await prisma.operator.create({
    data: { name, role, pinHash: await hash(pin) },
  });
  await prisma.auditLog.create({
    data: {
      action: "operator.create",
      entity: "operator",
      entityId: op.id,
      actorType: "user",
      actorId: actor.id,
      after: { name, role },
    },
  });
  return { ok: true, id: op.id };
}

export async function archiveOperatorAction(id: string): Promise<PanelResult> {
  const actor = await requireRole(...PANEL);
  await prisma.operator.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      action: "operator.archive",
      entity: "operator",
      entityId: id,
      actorType: "user",
      actorId: actor.id,
    },
  });
  return { ok: true };
}

export async function saveReceiptSettingsAction(
  footer: string,
  thresholdBs: string,
  maxDiscountPercent: string,
): Promise<PanelResult> {
  await requireRole(...PANEL);
  const threshold = Math.round(
    Number.parseFloat(thresholdBs.replace(",", ".")) * 100,
  );
  const maxPct = Math.max(
    0,
    Math.min(100, Number.parseInt(maxDiscountPercent, 10) || 0),
  );
  await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: {
      receiptFooter: footer.trim() || null,
      cashDifferenceThresholdBob: Number.isFinite(threshold) ? threshold : 500,
      maxCashierDiscountPercent: maxPct,
    },
  });
  revalidateTag("settings", "max");
  return { ok: true };
}
