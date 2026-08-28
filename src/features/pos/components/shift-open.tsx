"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openShiftAction } from "../actions";
import { type OperatorSession, posOperator } from "../pos-session";
import { PinPad } from "./pin-pad";

interface Operator {
  id: string;
  name: string;
  role: string;
}

export function ShiftOpen({
  token,
  operators,
  onOpen,
}: {
  token: string;
  operators: Operator[];
  onOpen: (s: OperatorSession) => void;
}) {
  const [step, setStep] = useState<"who" | "float" | "pin">("who");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [openingBs, setOpeningBs] = useState("");
  const [pending, start] = useTransition();

  function withPin(pin: string) {
    if (!operator) return;
    start(async () => {
      const r = await openShiftAction(token, {
        operatorId: operator.id,
        pin,
        openingBs,
      }).catch(
        () =>
          ({
            ok: false,
            error: "Abrí el turno con conexión al menos una vez",
          }) as Awaited<ReturnType<typeof openShiftAction>>,
      );
      if (r.ok && r.sessionId) {
        const s: OperatorSession = {
          sessionId: r.sessionId,
          operatorId: operator.id,
          operatorName: r.operatorName ?? operator.name,
          since: Date.now(),
        };
        posOperator.set(s);
        onOpen(s);
      } else {
        toast.error(
          r.lockedSeconds
            ? `Bloqueado ${r.lockedSeconds}s`
            : (r.error ?? "PIN incorrecto"),
        );
        setStep("pin");
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold tracking-tight">Abrir turno</h1>

      {step === "who" && (
        <div className="flex flex-col gap-2">
          {operators.map((o) => (
            <Button
              key={o.id}
              variant="outline"
              size="lg"
              className="justify-between"
              onClick={() => {
                setOperator(o);
                setStep("float");
              }}
            >
              {o.name}
              <span className="text-xs text-muted-foreground">{o.role}</span>
            </Button>
          ))}
        </div>
      )}

      {step === "float" && operator && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {operator.name} · declará el fondo de caja
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="float">Fondo de apertura (Bs)</Label>
            <Input
              id="float"
              inputMode="decimal"
              value={openingBs}
              onChange={(e) => setOpeningBs(e.target.value)}
              className="text-xl"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("who")}>
              Atrás
            </Button>
            <Button
              className="flex-1"
              disabled={!openingBs}
              onClick={() => setStep("pin")}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === "pin" && operator && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            PIN de {operator.name}
          </p>
          <PinPad onComplete={withPin} disabled={pending} />
          <Button variant="ghost" onClick={() => setStep("float")}>
            Atrás
          </Button>
        </div>
      )}
    </div>
  );
}
