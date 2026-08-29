"use server";
// Glass — ABM de usuarios del panel (§6.3). Solo PROPIETARIO/ADMINISTRADOR. El
// registro público está cerrado: las cuentas se crean acá.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import { auth } from "@/lib/auth";
import { requireRole } from "./roles";

export interface UserResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const PANEL = ["PROPIETARIO", "ADMINISTRADOR"] as const;
const ROLE = z.enum([
  "PROPIETARIO",
  "ADMINISTRADOR",
  "EDITOR",
  "CAJERO",
  "ALMACEN",
]);

const CreateSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  name: z.string().trim().min(2, "Poné un nombre").max(80),
  role: ROLE,
  password: z.string().min(8, "Mínimo 8 caracteres").max(200),
});

async function hashPassword(plain: string): Promise<string> {
  const ctx = await auth.$context;
  return ctx.password.hash(plain);
}

async function audit(action: string, entityId: string, actorId: string) {
  await prisma.auditLog.create({
    data: { action, entity: "user", entityId, actorType: "user", actorId },
  });
}

export async function createUserAction(raw: unknown): Promise<UserResult> {
  const actor = await requireRole(...PANEL);
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { email, name, role, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return { ok: false, error: "Ya hay una cuenta con ese correo" };
  }

  const userId = crypto.randomUUID();
  const hash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.create({
      data: { id: userId, email, name, emailVerified: true, role },
    }),
    prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        issuer: "local:credential",
        password: hash,
      },
    }),
  ]);
  await audit("user.create", userId, actor.id);
  revalidatePath("/panel/usuarios");
  return { ok: true, id: userId };
}

export async function setUserRoleAction(
  userId: string,
  role: string,
): Promise<UserResult> {
  const actor = await requireRole(...PANEL);
  const parsed = ROLE.safeParse(role);
  if (!parsed.success) return { ok: false, error: "Rol inválido" };
  await prisma.user.update({
    where: { id: userId },
    data: { role: parsed.data },
  });
  await audit("user.role", userId, actor.id);
  revalidatePath("/panel/usuarios");
  return { ok: true };
}

export async function archiveUserAction(userId: string): Promise<UserResult> {
  const actor = await requireRole(...PANEL);
  if (userId === actor.id) {
    return { ok: false, error: "No podés archivar tu propia cuenta" };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { archivedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  await audit("user.archive", userId, actor.id);
  revalidatePath("/panel/usuarios");
  return { ok: true };
}

export async function restoreUserAction(userId: string): Promise<UserResult> {
  const actor = await requireRole(...PANEL);
  await prisma.user.update({
    where: { id: userId },
    data: { archivedAt: null },
  });
  await audit("user.restore", userId, actor.id);
  revalidatePath("/panel/usuarios");
  return { ok: true };
}

export async function resetUserPasswordAction(
  userId: string,
  newPassword: string,
): Promise<UserResult> {
  const actor = await requireRole(...PANEL);
  if (newPassword.length < 8) {
    return { ok: false, error: "Mínimo 8 caracteres" };
  }
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  });
  const hash = await hashPassword(newPassword);
  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hash },
    });
  } else {
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        issuer: "local:credential",
        password: hash,
      },
    });
  }
  await prisma.session.deleteMany({ where: { userId } });
  await audit("user.password_reset", userId, actor.id);
  return { ok: true };
}
