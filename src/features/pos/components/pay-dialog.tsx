"use client";
// Glass — cobro. La venta se registra SIEMPRE contra la base local (§17.1); la
// sincronización va después, en segundo plano. El vuelto sale al instante.
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
import { verifyAuthPinAction } from "../actions";
import {
  findAuthorizerOffline,
  getOperatorsOffline,
} from "../offline/pin-offline";
import { recordLocalSale } from "../offline/record-sale";
import { syncNow } from "../offline/sync";
import type { CreateSaleInput } from "../schemas";
import { uuidv7 } from "../uuid";
import { PinPad } from "./pin-pad";

interface Method {
  id: string;
  label: string;
  countsInDrawer: boolean;
}

const SUPER_ROLES = ["PROPIETARIO", "ADMINISTRADOR"];

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
  onPaid: (ref: string) => void;
}) {
  const cash = methods.find((m) => m.countsInDrawer) ?? methods[0];
  const [methodId, setMethodId] = useState(cash?.id ?? "");
  const [tendered, setTendered] = useState("");
  const [authOperatorId, setAuthOperatorId] = useState<string | null>(null);
  const [askAuth, setAskAuth] = useState(false);
  const [pending, start] = useTransition();

  const tenderedBob = useMemo(() => {
    const n = Number.parseFloat(tendered.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }, [tendered]);
  const method = methods.find((m) => m.id === methodId);
  const isCash = method?.countsInDrawer ?? false;
  const change = isCash ? changeDue(totalBob, tenderedBob) : 0;
  const shortCash = isCash && tenderedBob < totalBob;

  async function resolveAuthorizer(pin: string): Promise<string | null> {
    const ops = await getOperatorsOffline();
    if (ops.length > 0) {
      const op = await findAuthorizerOffline(pin, SUPER_ROLES);
      return op?.id ?? null;
    }
    const r = await verifyAuthPinAction(token, pin);
    return r.ok && r.operatorId ? r.operatorId : null;
  }

  function confirm(pinOverride?: string) {
    const pin = pinOverride ?? undefined;
    if (needsAuth && !authOperatorId && !pin) {
      setAskAuth(true);
      return;
    }
    start(async () => {
      let authId = authOperatorId;
      if (needsAuth && !authId && pin) {
        authId = await resolveAuthorizer(pin);
        if (!authId) {
          toast.error("PIN de un rol superior inválido");
          setAskAuth(true);
          return;
        }
        setAuthOperatorId(authId);
        setAskAuth(false);
      }

      if (!method) {
        toast.error("Elegí un método de pago");
        return;
      }

      const ref = uuidv7();
      try {
        const r = await recordLocalSale({
          clientSaleId: ref,
          sessionId: payload.sessionId,
          lines: payload.lines.map((l) => ({
            variantId: String(l.variantId),
            qty: Number(l.qty),
            discountPercent: l.discountPercent
              ? Number(l.discountPercent)
              : undefined,
          })),
          globalDiscountPercent: payload.globalDiscountPercent,
          methodId,
          methodLabel: method.label,
          countsInDrawer: method.countsInDrawer,
          tenderedBob: isCash ? tenderedBob : totalBob,
          authorizedByOperatorId: authId,
          orderId: payload.orderId,
        });
        toast.success(
          `Venta registrada${
            r.changeBob ? ` · vuelto ${formatBob(r.changeBob)}` : ""
          }`,
        );
        onPaid(ref);
        onOpenChange(false);
        setTendered("");
        setAuthOperatorId(null);
        setAskAuth(false);
        void syncNow(token);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo cobrar");
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
