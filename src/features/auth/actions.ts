"use server";
// Glass — acciones de sesión del panel.
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
