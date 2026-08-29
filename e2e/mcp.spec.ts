import { expect, test } from "@playwright/test";

// Servidor de autorización MCP (Better Auth: jwt + mcp + cimd).

test("publica la metadata OAuth 2.1 del servidor de autorización", async ({
  request,
}) => {
  const res = await request.get(
    "/api/auth/.well-known/oauth-authorization-server",
  );
  expect(res.ok()).toBeTruthy();
  const meta = await res.json();
  expect(meta.issuer).toContain("/api/auth");
  expect(meta.authorization_endpoint).toContain("/oauth2/authorize");
  expect(meta.token_endpoint).toContain("/oauth2/token");
  expect(meta.jwks_uri).toContain("/jwks");
});

test("publica la metadata del recurso protegido (RFC 9728)", async ({
  request,
}) => {
  const res = await request.get(
    "/.well-known/oauth-protected-resource/api/mcp",
    { headers: { accept: "application/json" } },
  );
  expect(res.ok()).toBeTruthy();
  const meta = await res.json();
  expect(meta.resource).toContain("/api/mcp");
  expect(meta.authorization_servers?.[0]).toContain("/api/auth");
});

test("/api/mcp sin token responde 401 con WWW-Authenticate", async ({
  request,
}) => {
  const res = await request.post("/api/mcp", {
    headers: { "content-type": "application/json" },
    data: { jsonrpc: "2.0", method: "tools/list", id: 1 },
  });
  expect(res.status()).toBe(401);
  const challenge = res.headers()["www-authenticate"] ?? "";
  expect(challenge.toLowerCase()).toContain("bearer");
  expect(challenge).toContain("resource_metadata=");
});
