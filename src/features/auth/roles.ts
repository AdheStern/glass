// Glass — identidad del panel (§6, §21). "Toda action comprueba el rol."
// Auth con Better Auth (ADR-04); el POS no pasa por acá.
import "server-only";
import type { Role } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Roles con acceso al panel de administración (§6.3). */
export const PANEL_ROLES: Role[] = [
  "PROPIETARIO",
  "ADMINISTRADOR",
  "EDITOR",
  "ALMACEN",
];

/** Roles que pueden operar inventario y etiquetas (§14, §6.3). */
export const INVENTORY_ROLES: Role[] = [
  "PROPIETARIO",
  "ADMINISTRADOR",
  "ALMACEN",
];

const ROLES: Role[] = [
  "PROPIETARIO",
  "ADMINISTRADOR",
  "EDITOR",
  "CAJERO",
  "ALMACEN",
];

export function parseRole(value: unknown): Role {
  return typeof value === "string" && (ROLES as string[]).includes(value)
    ? (value as Role)
    : "CAJERO";
}

export interface SessionProfile {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  archivedAt: Date | null;
  createdAt: Date;
}

/**
 * Perfil del usuario autenticado, o `null`. El correo de `OWNER_EMAIL` cuenta
 * como PROPIETARIO aunque la columna diga otra cosa (red de seguridad, §4.3).
 */
export const currentProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const session = await auth.api
      .getSession({ headers: await headers() })
      .catch(() => null);
    const user = session?.user;
    if (!user) return null;

    const owner = (process.env.OWNER_EMAIL ?? "").toLowerCase();
    const role =
      owner && user.email.toLowerCase() === owner
        ? "PROPIETARIO"
        : parseRole((user as { role?: unknown }).role);

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role,
      archivedAt:
        (user as { archivedAt?: Date | string | null }).archivedAt != null
          ? new Date(
              (user as { archivedAt: Date | string }).archivedAt as string,
            )
          : null,
      createdAt: new Date(user.createdAt),
    };
  },
);

/** Para server actions / route handlers: lanza `AuthError` si no cumple. */
export async function requireRole(...allowed: Role[]): Promise<SessionProfile> {
  const profile = await currentProfile();
  if (!profile || profile.archivedAt) throw new AuthError("no autenticado");
  if (allowed.length > 0 && !allowed.includes(profile.role)) {
    throw new AuthError(`rol insuficiente (${profile.role})`);
  }
  return profile;
}

/** Para layouts / páginas del panel: redirige en vez de lanzar. */
export async function requirePanel(
  ...allowed: Role[]
): Promise<SessionProfile> {
  const profile = await currentProfile();
  if (!profile || profile.archivedAt) redirect("/entrar");
  const roles = allowed.length > 0 ? allowed : PANEL_ROLES;
  if (!roles.includes(profile.role)) redirect("/entrar?e=rol");
  return profile;
}

/** Para páginas de inventario/etiquetas: redirige si el rol no alcanza (§14). */
export function requireInventory(): Promise<SessionProfile> {
  return requirePanel(...INVENTORY_ROLES);
}

export function canSeeCosts(role: Role): boolean {
  return role === "PROPIETARIO";
}
