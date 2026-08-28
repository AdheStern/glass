"use client";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeDue } from "@/domain/arqueo";
import { formatBob } from "@/domain/money";
import { createSaleAction } from "../actions";
import type { CreateSaleInput } from "../schemas";
import { uuidv7 } from "../uuid";
import { PinPad } from "./pin-pad";

interface Method {
  id: string;
  label: string;
  countsInDrawer: boolean;
}

export interface PaySalePayload {
  sessionId: string;
  lines: CreateSaleInput["lines"];
  globalDiscountPercent?: number;
  orderId?: string;
}

export function PayDialog({
  open,
  onOpenChange,
  token,
  totalBob,
  methods,
  payload,
  needsAuth,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  token: string;
  totalBob: number;
  methods: Method[];
  payload: PaySalePayload;
  needsAuth: boolean;
  onPaid: (folio: string) => void;
}) {
  const cash = methods.find((m) => m.countsInDrawer) ?? methods[0];
  const [methodId, setMethodId] = useState(cash?.id ?? "");
  const [tendered, setTendered] = useState("");
  const [authPin, setAuthPin] = useState<string | null>(null);
  const [askAuth, setAskAuth] = useState(false);
  const [pending, start] = useTransition();

  const tenderedBob = useMemo(() => {
    const n = Number.parseFloat(tendered.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }, [tendered]);
  const isCash =
    methods.find((m) => m.id === methodId)?.countsInDrawer ?? false;
  const change = isCash ? changeDue(totalBob, tenderedBob) : 0;
  const shortCash = isCash && tenderedBob < totalBob;

  function confirm(pinOverride?: string) {
    const pin = pinOverride ?? authPin ?? undefined;
    if (needsAuth && !pin) {
      setAskAuth(true);
      return;
    }
    start(async () => {
      const r = await createSaleAction(token, {
        clientSaleId: uuidv7(),
        occurredAtDevice: new Date(),
        sessionId: payload.sessionId,
        lines: payload.lines,
        globalDiscountPercent: payload.globalDiscountPercent,
        payments: [{ methodId, amountBob: totalBob }],
        tenderedBob: isCash ? tenderedBob : totalBob,
        orderId: payload.orderId,
        authPin: pin,
      });
      if (r.ok && r.folio) {
        toast.success(
          `Venta ${r.folio}${r.changeBob ? ` · vuelto ${formatBob(r.changeBob)}` : ""}`,
        );
        onPaid(r.folio);
        onOpenChange(false);
        setTendered("");
        setAuthPin(null);
        setAskAuth(false);
      } else {
        toast.error(r.error ?? "No se pudo cobrar");
        if (r.error?.includes("PIN")) setAskAuth(true);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cobrar {formatBob(totalBob)}</DialogTitle>
        </DialogHeader>

        {askAuth ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              PIN de un rol superior para autorizar el descuento
            </p>
            <PinPad
              disabled={pending}
              onComplete={(pin) => {
                setAuthPin(pin);
                setAskAuth(false);
                confirm(pin);
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {methods.map((m) => (
                <Button
                  key={m.id}
                  variant={m.id === methodId ? "default" : "outline"}
                  onClick={() => setMethodId(m.id)}
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {isCash && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tendered">Monto recibido (Bs)</Label>
                <Input
                  id="tendered"
                  inputMode="decimal"
                  autoFocus
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  className="text-2xl"
                />
              </div>
            )}

            {isCash && (
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">Vuelto</p>
                <p className="text-4xl font-bold tabular-nums">
                  {formatBob(change)}
                </p>
              </div>
            )}

            <Button
              size="lg"
              disabled={pending || shortCash || !methodId}
              onClick={() => confirm()}
            >
              {pending ? "Cobrando…" : "Confirmar cobro"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
