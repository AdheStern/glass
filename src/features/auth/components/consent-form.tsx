"use client";
// Glass — consentimiento del flujo OAuth/MCP (§ADR-04). El usuario del panel ya
// está autenticado (el paso `/oauth2/authorize` lo garantiza); acá aprueba o
// rechaza el acceso de una aplicación externa.
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SCOPE_LABELS: Record<string, string> = {
  openid: "identificarte",
  profile: "tu nombre",
  email: "tu correo",
  offline_access: "acceso continuo (sin volver a pedir permiso)",
  mcp: "usar las herramientas de Glass",
};

export function ConsentForm() {
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = params.get("client_id") ?? "una aplicación";
  const scopes = (params.get("scope") ?? "").split(" ").filter(Boolean);

  async function decide(accept: boolean) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accept,
          oauth_query: window.location.search.replace(/^\?/, ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const url: string | undefined =
        data.url ?? data.redirectURI ?? data.redirect_uri;
      if (url) {
        window.location.href = url;
        return;
      }
      if (!res.ok)
        throw new Error(data.error_description ?? "No se pudo procesar");
      setError("No se recibió una URL de redirección.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Autorizar acceso</CardTitle>
        <CardDescription>
          <span className="font-medium">{clientId}</span> quiere acceder a tu
          cuenta de Glass.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {scopes.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {scopes.map((s) => (
              <li key={s}>{SCOPE_LABELS[s] ?? s}</li>
            ))}
          </ul>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={pending}
            onClick={() => decide(false)}
          >
            Rechazar
          </Button>
          <Button
            className="flex-1"
            disabled={pending}
            onClick={() => decide(true)}
          >
            Permitir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
