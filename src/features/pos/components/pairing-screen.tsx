"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pairDeviceAction } from "../actions";
import { type DeviceSession, posDevice } from "../pos-session";

export function PairingScreen({
  onPaired,
}: {
  onPaired: (d: DeviceSession) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const r = await pairDeviceAction({ code, name });
      if (r.ok && r.token && r.deviceId) {
        const d = {
          token: r.token,
          deviceId: r.deviceId,
          name: r.name ?? name,
        };
        posDevice.set(d);
        onPaired(d);
      } else {
        toast.error(r.error ?? "No se pudo emparejar");
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Emparejar esta caja
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedí el código de 6 dígitos en el panel (Dispositivos).
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Código de emparejamiento</Label>
        <Input
          id="code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="text-center text-2xl tracking-[0.5em]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre de la caja</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Caja mostrador"
        />
      </div>
      <Button
        size="lg"
        disabled={pending || code.length !== 6 || name.trim().length < 2}
        onClick={submit}
      >
        Emparejar
      </Button>
    </div>
  );
}
