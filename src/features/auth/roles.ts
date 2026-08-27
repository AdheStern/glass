// Glass — identidad del panel (§6, §21). "Toda action comprueba el rol."
import "server-only";
import type { Role, UserProfile } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ensureProfile } from "./owner";
import { createSupabaseServerClient } from "./supabase-server";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Roles con acceso al panel de administración (§6.3). */
export const PANEL_ROLES: Role[] = ["PROPIETARIO", "ADMINISTRADOR", "EDITOR"];

/**
 * Perfil del usuario autenticado. Lo auto-provisiona en el primer acceso
 * (cualquier método de login), asignando PROPIETARIO si el correo es OWNER_EMAIL.
 */
export const currentProfile = cache(async (): Promise<UserProfile | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null; // Supabase sin configurar
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return ensureProfile({
    authUserId: user.id,
    email: user.email ?? "",
    name: (user.user_metadata?.full_name as string | undefined) ?? null,
  });
});

/** Para server actions / route handlers: lanza `AuthError` si no cumple. */
export async function requireRole(...allowed: Role[]): Promise<UserProfile> {
  const profile = await currentProfile();
  if (!profile || profile.archivedAt) throw new AuthError("no autenticado");
  if (allowed.length > 0 && !allowed.includes(profile.role)) {
    throw new AuthError(`rol insuficiente (${profile.role})`);
  }
  return profile;
}

/** Para layouts / páginas del panel: redirige en vez de lanzar. */
export async function requirePanel(...allowed: Role[]): Promise<UserProfile> {
  const profile = await currentProfile();
  if (!profile || profile.archivedAt) redirect("/entrar");
  const roles = allowed.length > 0 ? allowed : PANEL_ROLES;
  if (!roles.includes(profile.role)) redirect("/entrar?e=rol");
  return profile;
}

export function canSeeCosts(role: Role): boolean {
  return role === "PROPIETARIO";
}
