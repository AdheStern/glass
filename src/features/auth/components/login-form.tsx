"use client";
// Glass — ingreso al panel con Better Auth (correo/contraseña). El registro
// público está cerrado: el propietario se siembra y el resto se crea en
// /panel/usuarios.
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
import { authClient } from "@/lib/auth-client";

export function LoginForm({ hasUsers = true }: { hasUsers?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(
    params.get("e") === "rol" ? "Tu cuenta no tiene acceso al panel." : null,
  );

  if (!hasUsers) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Todavía no hay propietario</CardTitle>
          <CardDescription>
            Corré <code>pnpm db:seed</code> para crear la cuenta del propietario
            a partir de <code>OWNER_EMAIL</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const { error } = await authClient.signIn.email({ email, password });
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
        <CardDescription>Ingresá con tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Ingresando…" : "Ingresar"}
          </Button>
          {message && <p className="text-sm text-destructive">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
