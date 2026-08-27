// Glass — siembra idempotente del perfil de usuario. El correo de OWNER_EMAIL
// queda como PROPIETARIO al primer inicio de sesión (§4.3, §6.3).
import "server-only";
import { prisma } from "@/db/client";

export async function ensureProfile(params: {
  authUserId: string;
  email: string;
  name?: string | null;
}) {
  const isOwner =
    params.email.toLowerCase() === (process.env.OWNER_EMAIL ?? "").toLowerCase();

  return prisma.userProfile.upsert({
    where: { authUserId: params.authUserId },
    create: {
      authUserId: params.authUserId,
      email: params.email,
      name: params.name ?? null,
      role: isOwner ? "PROPIETARIO" : "CAJERO",
    },
    update: {
      email: params.email,
      ...(isOwner ? { role: "PROPIETARIO" as const } : {}),
    },
  });
}
