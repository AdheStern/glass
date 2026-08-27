// Glass — guarda de rol para server actions y route handlers (§21).
// "Toda action comprueba el rol. Sin excepciones «porque viene de mi propio formulario»."
import "server-only";
import type { Role, UserProfile } from "@prisma/client";
import { prisma } from "@/db/client";
import { createSupabaseServerClient } from "./supabase-server";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Perfil de la aplicación del usuario autenticado, o null. */
export async function currentProfile(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.userProfile.findUnique({ where: { authUserId: user.id } });
}

/**
 * Exige un usuario autenticado con uno de los roles indicados (o cualquiera si
 * la lista va vacía). Lanza `AuthError` si no cumple.
 */
export async function requireRole(...allowed: Role[]): Promise<UserProfile> {
  const profile = await currentProfile();
  if (!profile || profile.archivedAt) {
    throw new AuthError("no autenticado");
  }
  if (allowed.length > 0 && !allowed.includes(profile.role)) {
    throw new AuthError(`rol insuficiente (${profile.role})`);
  }
  return profile;
}
