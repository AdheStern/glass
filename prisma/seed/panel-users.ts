// Glass — usuario ADMINISTRADOR de demostración para el panel (Better Auth). El
// PROPIETARIO lo siembra `owner.ts` desde OWNER_EMAIL; esto agrega un admin con
// credenciales conocidas para probar el panel sin usar la cuenta del dueño.
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

export const DEMO_ADMIN = {
  email: "admin@celulares.demo",
  password: "admin-demo-2026",
};

export async function seedPanelUsers(prisma: PrismaClient) {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_ADMIN.email },
  });
  if (existing) {
    console.log(`glass/seed: admin de demo ya existe — ${DEMO_ADMIN.email}`);
    return;
  }

  const userId = randomUUID();
  const password = await hashPassword(DEMO_ADMIN.password);
  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        email: DEMO_ADMIN.email,
        name: "Administrador demo",
        emailVerified: true,
        role: "ADMINISTRADOR",
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        issuer: "local:credential",
        password,
      },
    }),
  ]);

  console.log(
    `glass/seed: admin de demo sembrado — ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`,
  );
}
