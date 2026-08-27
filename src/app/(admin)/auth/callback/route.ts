// Glass — intercambio del código OAuth de Supabase (Google) por sesión.
import { NextResponse } from "next/server";
import { ensureProfile } from "@/auth/owner";
import { createSupabaseServerClient } from "@/auth/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/panel";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureProfile({
        authUserId: data.user.id,
        email: data.user.email ?? "",
        name: (data.user.user_metadata?.full_name as string) ?? null,
      });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/panel?error=auth`);
}
