"use client";
import { ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBob } from "@/domain/money";
import { advanceOrderAction, cancelOrderAction } from "../actions";
import type { BoardOrder } from "../queries";

const COLUMNS: { key: string; title: string }[] = [
  { key: "NUEVO", title: "Nuevos" },
  { key: "CONFIRMADO", title: "Confirmados" },
  { key: "PREPARADO", title: "Preparados" },
  { key: "ENTREGADO", title: "Entregados hoy" },
];

function ageClass(hours: number, status: string): string {
  if (status !== "NUEVO" && status !== "CONFIRMADO") return "";
  if (hours >= 24) return "border-l-4 border-l-red-500";
  if (hours >= 2) return "border-l-4 border-l-amber-500";
  return "";
}

export function OrderBoard({
  orders,
  query,
}: {
  orders: BoardOrder[];
  query: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(query);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else toast.error(r.error ?? "Error");
    });

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(
            q ? `/panel/pedidos?q=${encodeURIComponent(q)}` : "/panel/pedidos",
          );
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por folio, teléfono o nombre"
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                {col.title}
                <Badge variant="secondary">{items.length}</Badge>
              </h2>
              {items.length === 0 && (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Vacío
                </p>
              )}
              {items.map((o) => (
                <div
                  key={o.id}
                  className={`rounded-lg border bg-card p-3 text-sm ${ageClass(o.ageHours, o.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{o.folio}</span>
                    <span className="tabular-nums">
                      {formatBob(o.totalBob)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {o.customerName ?? "Sin nombre"}
                    {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.itemCount} artículo(s) ·{" "}
                    {o.createdAt.toLocaleString("es-BO")}
                  </p>
                  {o.status !== "ENTREGADO" && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => advanceOrderAction(o.id))}
                      >
                        Avanzar <ArrowRight className="ml-1 size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => run(() => cancelOrderAction(o.id))}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
