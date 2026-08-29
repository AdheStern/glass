// Glass — endpoint MCP protegido (§ADR-04). El token lo verifica `requireMcpAuth`
// contra el JWKS de Better Auth; las herramientas son de solo lectura.
import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildGlassMcpServer, resolveCaller } from "@/features/mcp/tools";
import { auth, MCP_RESOURCE } from "@/lib/auth";

export const POST = requireMcpAuth(
  auth,
  async (request, claims) => {
    const caller = await resolveCaller(claims);
    if (!caller) {
      return new Response(JSON.stringify({ error: "usuario no autorizado" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    const handler = createMcpHandler(() => buildGlassMcpServer(caller), {
      legacy: "reject",
    });
    return handler.fetch(request);
  },
  { resource: MCP_RESOURCE },
);
