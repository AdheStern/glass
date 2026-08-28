"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cashMovementAction } from "../actions";
import { PinPad } from "./pin-pad";

type Kind = "INGRESO" | "RETIRO" | "GASTO";

export function CashMovements({
  token,
  sessionId,
}: {
  token: string;
  sessionId: string;
}) {
  const [kind, setKind] = useState<Kind>("INGRESO");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [askPin, setAskPin] = useState(false);
  const [pending, start] = useTransition();

  function submit(authPin?: string) {
    if (kind !== "INGRESO" && !authPin) {
      setAskPin(true);
      return;
    }
    start(async () => {
      const r = await cashMovementAction(token, {
        sessionId,
        kind,
        amountBs: amount,
        reason,
        authPin,
      });
      if (r.ok) {
        toast.success("Movimiento registrado");
        setAmount("");
        setReason("");
        setAskPin(false);
      } else {
        toast.error(r.error ?? "Error");
      }
    });
  }

  if (askPin) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          PIN de rol superior para {kind.toLowerCase()}
        </p>
        <PinPad disabled={pending} onComplete={(pin) => submit(pin)} />
        <Button variant="ghost" size="sm" onClick={() => setAskPin(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Movimiento de efectivo</h3>
      <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="INGRESO">Ingreso (cambio, aporte)</SelectItem>
          <SelectItem value="RETIRO">Retiro (a caja fuerte)</SelectItem>
          <SelectItem value="GASTO">Gasto (insumos)</SelectItem>
        </SelectContent>
      </Select>
      <Input
        inputMode="decimal"
        placeholder="Monto (Bs)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        placeholder="Motivo"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button disabled={pending || !amount} onClick={() => submit()}>
        Registrar
      </Button>
    </div>
  );
}
