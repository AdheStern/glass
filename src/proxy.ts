// Glass — Proxy (antes "middleware", renombrado en Next 16). Chequeo optimista:
// sin cookie de sesión en /panel/* → a /entrar. El rol real lo valida
// requirePanel() en el layout.
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const cookie = getSessionCookie(request);
  if (!cookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Solo el panel necesita sesión. El catálogo, el POS y /api/* quedan fuera.
  matcher: ["/panel/:path*"],
};
