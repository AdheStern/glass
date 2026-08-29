"use server";
// Glass — acciones de sesión del panel (Better Auth).
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  redirect("/entrar");
}
