// Glass — metadata RFC 9728 del recurso protegido MCP. Se sirve en
// `/.well-known/oauth-protected-resource/api/mcp` vía un rewrite de next.config
// (Next ignora las carpetas que empiezan con punto).
import { oauthMetadataResponse } from "@modelcontextprotocol/server";
import { connection } from "next/server";
import { BASE_URL, MCP_RESOURCE } from "@/lib/auth";

export async function GET(request: Request): Promise<Response> {
  await connection();
  const asMeta = await fetch(
    `${BASE_URL}/api/auth/.well-known/oauth-authorization-server`,
    { cache: "no-store" },
  )
    .then((r) => r.json())
    .catch(() => null);

  if (!asMeta) {
    return Response.json({ error: "auth server unreachable" }, { status: 502 });
  }

  // `oauthMetadataResponse` decide por el path del request; lo forzamos al
  // canónico para que emita el documento correcto.
  const canonical = new Request(
    `${BASE_URL}/.well-known/oauth-protected-resource/api/mcp`,
    { headers: request.headers },
  );
  const res = oauthMetadataResponse(canonical, {
    oauthMetadata: asMeta,
    resourceServerUrl: new URL(MCP_RESOURCE),
    scopesSupported: ["openid", "profile", "email", "offline_access"],
    resourceName: "Glass MCP",
    dangerouslyAllowInsecureIssuerUrl: process.env.NODE_ENV !== "production",
  });

  return res ?? Response.json({ error: "no metadata" }, { status: 404 });
}
