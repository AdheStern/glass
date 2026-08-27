// Glass — Proxy (antes "middleware", renombrado en Next 16).
// Refresca la sesión de Supabase en cada petición al panel.
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Revalida el token; escribe cookies nuevas si hace falta.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Solo el panel necesita sesión. El catálogo público y el POS quedan fuera.
  // (Los route groups como (admin) no aparecen en la URL; el panel vive en /panel.)
  matcher: ["/panel/:path*"],
};
