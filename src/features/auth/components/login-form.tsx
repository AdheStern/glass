"use client";
// Cliente: usa el SDK de Supabase en el navegador para iniciar sesión.
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/features/auth/supabase-client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(
    params.get("e") === "rol" ? "Tu cuenta no tiene acceso al panel." : null,
  );

  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configured) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Falta configurar Supabase</CardTitle>
          <CardDescription>
            Agregá <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> y{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> a <code>.env</code> y
            reiniciá.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const supabase = createSupabaseBrowserClient();

  async function withGoogle() {
    setPending(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/panel` },
    });
    if (error) {
      setMessage(error.message);
      setPending(false);
    }
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?next=/panel`,
        },
      });
      setPending(false);
      setMessage(
        error ? error.message : "Revisá tu correo para confirmar la cuenta.",
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setPending(false);
      setMessage("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Panel de administración</CardTitle>
        <CardDescription>
          {mode === "signin"
            ? "Ingresá con tu cuenta."
            : "Creá la cuenta del propietario."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={withGoogle}
          disabled={pending}
        >
          Continuar con Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />o
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={withEmail} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {mode === "signin" ? "Ingresar" : "Crear cuenta"}
          </Button>
        </form>

        {message && <p className="text-sm text-destructive">{message}</p>}

        <button
          type="button"
          className="text-sm text-muted-foreground underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta"}
        </button>
      </CardContent>
    </Card>
  );
}
