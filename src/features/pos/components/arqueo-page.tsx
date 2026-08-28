"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatBob } from "@/domain/money";
import { getSessionSummaryAction } from "../actions";
import { posDevice } from "../pos-session";
import type { SessionSummary } from "../types";

export function ArqueoPage({ sessionId }: { sessionId: string }) {
  const [summary, setSummary] = useState<SessionSummary | null | "loading">(
    "loading",
  );

  useEffect(() => {
    const device = posDevice.get();
    if (!device) {
      setSummary(null);
      return;
    }
    getSessionSummaryAction(device.token, sessionId).then(setSummary);
  }, [sessionId]);

  if (summary === "loading") {
    return (
      <p className="p-8 text-center text-muted-foreground">
        Cargando el arqueo…
      </p>
    );
  }
  if (!summary) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        Turno no encontrado.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Arqueo</h1>
        <Button asChild size="sm" variant="ghost">
          <Link href="/pos">Nueva caja</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {summary.operatorName} · {summary.openedAt.toLocaleString("es-BO")}
        {summary.closedAt
          ? ` → ${summary.closedAt.toLocaleString("es-BO")}`
          : " (abierto)"}
      </p>

      <div className="rounded-lg border p-4 text-sm">
        <Row label="Fondo de apertura" value={summary.openingBob} />
        {summary.byMethod.map((m) => (
          <Row
            key={m.label}
            label={m.label}
            value={m.totalBob}
            muted={!m.countsInDrawer}
          />
        ))}
        {summary.movements.map((mv) => (
          <Row
            key={`${mv.kind}-${mv.occurredAt.toISOString()}`}
            label={`${mv.kind}${mv.reason ? ` · ${mv.reason}` : ""}`}
            value={mv.kind === "INGRESO" ? mv.amountBob : -mv.amountBob}
          />
        ))}
        <hr className="my-2" />
        <Row label="Esperado en cajón" value={summary.expectedBob} bold />
        {summary.countedBob != null && (
          <Row label="Contado declarado" value={summary.countedBob} bold />
        )}
        {summary.differenceBob != null && (
          <div className="flex justify-between font-bold">
            <span>Diferencia</span>
            <span
              className={`tabular-nums ${summary.differenceBob < 0 ? "text-red-600" : "text-emerald-600"}`}
            >
              {formatBob(summary.differenceBob)}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {summary.saleCount} ventas · {summary.voidedCount} anuladas
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatBob(value)}</span>
    </div>
  );
}
