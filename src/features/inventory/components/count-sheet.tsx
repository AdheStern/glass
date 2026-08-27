"use client";
// Contar una toma de inventario (§14.3). Modo continuo: cada escaneo suma 1 al
// contado. Al cerrar, solo se muestran las diferencias, ordenadas por dinero.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBob } from "@/domain/money";
import { ScanField } from "@/features/scanner/scan-field";
import {
  applyStockCountAction,
  cancelStockCountAction,
  closeStockCountAction,
  countScanAction,
  lookupScanAction,
  saveCountLineAction,
} from "../actions";
import type { StockCountDetail } from "../queries";

export function CountSheet({ count }: { count: StockCountDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const open = count.status === "ABIERTA";
  const closed = count.status === "CERRADA";

  function onScan(code: string) {
    start(async () => {
      const found = await lookupScanAction(code);
      if (!found.found) {
        toast.error("Código no encontrado");
        return;
      }
      const r = await countScanAction(count.id, found.variant.variantId);
      if (r.ok) {
        toast.success(`+1 ${found.variant.productName}`);
        router.refresh();
      } else {
        toast.error(r.error ?? "Error");
      }
    });
  }

  const act = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    ok: string,
  ) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(ok);
        router.refresh();
      } else {
        toast.error(r.error ?? "Error");
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={count.status === "APLICADA" ? "default" : "secondary"}>
          {count.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {count.scope === "CATEGORIA" ? count.categoryName : count.scope} ·
          congelada {count.frozenAt.toLocaleString("es-BO")}
        </span>
      </div>

      {open && (
        <>
          <ScanField onScan={onScan} placeholder="Escaneá para contar" />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Producto</th>
                  <th className="p-2 text-right">Teórico</th>
                  <th className="p-2 text-right">Contado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {count.lines.map((l) => (
                  <tr key={l.variantId}>
                    <td className="p-2">{l.label}</td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">
                      {l.theoreticalQty}
                    </td>
                    <td className="p-2 text-right">
                      <Input
                        className="ml-auto w-20 text-right"
                        inputMode="numeric"
                        defaultValue={l.countedQty ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === "") return;
                          act(
                            () =>
                              saveCountLineAction({
                                stockCountId: count.id,
                                variantId: l.variantId,
                                countedQty: Number(v),
                              }),
                            "Guardado",
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                act(() => closeStockCountAction(count.id), "Toma cerrada")
              }
            >
              Cerrar y ver diferencias
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                act(() => cancelStockCountAction(count.id), "Toma cancelada")
              }
            >
              Cancelar toma
            </Button>
          </div>
        </>
      )}

      {(closed || count.status === "APLICADA") && (
        <>
          <h2 className="text-sm font-semibold">
            Diferencias ({count.diff.length})
          </h2>
          {count.diff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin diferencias: el conteo cuadró con el teórico.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">Producto</th>
                    <th className="p-2 text-right">Teórico</th>
                    <th className="p-2 text-right">Contado</th>
                    <th className="p-2 text-right">Ajuste</th>
                    <th className="p-2 text-right">Impacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {count.diff.map((d) => (
                    <tr key={d.variantId}>
                      <td className="p-2">{count.diffLabels[d.variantId]}</td>
                      <td className="p-2 text-right tabular-nums">
                        {d.theoreticalQty}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {d.countedQty}
                      </td>
                      <td
                        className={`p-2 text-right font-medium tabular-nums ${
                          d.delta < 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {d.delta > 0 ? `+${d.delta}` : d.delta}
                      </td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">
                        {formatBob(d.moneyImpactBob)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {closed && (
            <div className="flex gap-2">
              <Button
                disabled={pending}
                onClick={() =>
                  act(
                    () => applyStockCountAction(count.id),
                    "Ajustes generados",
                  )
                }
              >
                Aprobar y generar ajustes
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  act(() => cancelStockCountAction(count.id), "Toma cancelada")
                }
              >
                Descartar
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
