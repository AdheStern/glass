import "server-only";
// Glass — auth del panel (ADR-04): Better Auth sobre el mismo Postgres. El POS
// no pasa por acá (token de dispositivo + PIN). Además es servidor de
// autorización MCP: `jwt()` + `mcp()` + `cimd()` exponen OAuth 2.1 para clientes
// MCP y `/api/mcp` publica herramientas de solo lectura.
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { prisma } from "@/db/client";

const DEV_SECRET = "glass-dev-insecure-secret-cambiar-en-produccion-0000";

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("glass/auth: falta BETTER_AUTH_SECRET");
  }
  console.warn(
    "glass/auth: BETTER_AUTH_SECRET ausente — usando secreto de dev",
  );
  return DEV_SECRET;
}

export const BASE_URL =
  process.env.BETTER_AUTH_URL ??
  process.env.SITE_URL ??
  "http://localhost:3000";

/** Identificador del recurso protegido MCP (RFC 8707 / 9728). */
export const MCP_RESOURCE = `${BASE_URL}/api/mcp`;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: secret(),
  baseURL: BASE_URL,
  // El límite por defecto (10/min) corta la ráfaga de logins del e2e.
  rateLimit: process.env.GLASS_E2E
    ? { enabled: false }
    : { enabled: true, window: 60, max: 30 },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // el propietario se siembra; el resto por /panel/usuarios
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      // Rol del panel (§6.3). `input: false` → nadie lo fija al registrarse;
      // lo asignan la siembra y el ABM de usuarios.
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "CAJERO",
      },
      archivedAt: { type: "date", required: false, input: false },
    },
  },
  plugins: [
    jwt(),
    mcp({
      loginPage: "/entrar",
      consentPage: "/consent",
      resource: MCP_RESOURCE,
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
    }),
    nextCookies(), // SIEMPRE último
  ],
});

export type Auth = typeof auth;
