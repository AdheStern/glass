"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBob } from "@/domain/money";
import { closeShiftAction } from "../actions";
import { pendingCount } from "../offline/queue";
import { syncNow } from "../offline/sync";
import { posOperator } from "../pos-session";

export function ShiftClose({
  token,
  sessionId,
}: {
  token: string;
  sessionId: string;
}) {
  const router = useRouter();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{
    expectedBob: number;
    differenceBob: number;
    needsNote: boolean;
  } | null>(null);
  // Arranca sin confirmar para no habilitar el cierre antes de sincronizar.
  const [unsynced, setUnsynced] = useState<number | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    async function tick() {
      await syncNow(token).catch(() => undefined);
      if (alive) setUnsynced(await pendingCount().catch(() => 0));
    }
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [token]);

  function close() {
    start(async () => {
      const r = await closeShiftAction(token, {
        sessionId,
        countedBs: counted,
        note,
      });
      if (r.ok) {
        toast.success("Turno cerrado");
        posOperator.clear();
        router.replace(`/pos/arqueo/${sessionId}`);
        return;
      }
      if (r.needsNote && r.expectedBob != null && r.differenceBob != null) {
        setResult({
          expectedBob: r.expectedBob,
          differenceBob: r.differenceBob,
          needsNote: true,
        });
        toast.error(r.error ?? "Escribí una nota");
        return;
      }
      toast.error(r.error ?? "No se pudo cerrar");
    });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Cerrar turno</h1>
      <p className="text-sm text-muted-foreground">
        Contá el efectivo del cajón y declaralo <strong>antes</strong> de ver lo
        esperado (§16.2).
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="counted">Efectivo contado (Bs)</Label>
        <Input
          id="counted"
          inputMode="decimal"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          className="text-xl"
        />
      </div>

      {result && (
        <div className="rounded-lg border p-4 text-sm">
          <div className="flex justify-between">
            <span>Esperado</span>
            <span className="tabular-nums">
              {formatBob(result.expectedBob)}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Diferencia</span>
            <span
              className={`tabular-nums ${result.differenceBob < 0 ? "text-red-600" : "text-emerald-600"}`}
            >
              {formatBob(result.differenceBob)}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">
          Nota{" "}
          {result?.needsNote ? "(obligatoria por la diferencia)" : "(opcional)"}
        </Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {unsynced == null && (
        <p className="text-sm text-muted-foreground">Revisando la cola…</p>
      )}
      {unsynced != null && unsynced > 0 && (
        <p className="text-sm text-amber-600">
          Sincronizando {unsynced} {unsynced === 1 ? "venta" : "ventas"} antes
          de cerrar…
        </p>
      )}

      <Button
        size="lg"
        disabled={pending || !counted || unsynced == null || unsynced > 0}
        onClick={close}
      >
        {result ? "Confirmar cierre" : "Cerrar turno"}
      </Button>
    </div>
  );
}
