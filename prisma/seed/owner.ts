// Glass — siembra del propietario del panel (§4.3, §6.3). Better Auth: crea el
// `user` + la `account` de credenciales. Solo si todavía no hay usuarios.

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

export async function seedOwner(prisma: PrismaClient) {
  const email = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.log("glass/seed: sin OWNER_EMAIL, no se siembra propietario");
    return;
  }
  if ((await prisma.user.count()) > 0) {
    console.log("glass/seed: ya hay usuarios, no se re-siembra el propietario");
    return;
  }

  const password = process.env.OWNER_PASSWORD || "glass-cambiar";
  const userId = randomUUID();
  const hash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        email,
        name: "Propietario",
        emailVerified: true,
        role: "PROPIETARIO",
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        issuer: "local:credential", // createLocalAccountIssuer("credential")
        password: hash,
      },
    }),
  ]);

  console.log(
    `glass/seed: propietario sembrado — ${email} · contraseña temporal "${password}" (cambiala en /panel/usuarios)`,
  );
}
