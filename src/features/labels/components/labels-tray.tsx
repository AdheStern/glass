"use client";
// Bandeja de etiquetas (§14.4, §15.2): elegir variantes, generar los códigos
// internos que falten y descargar el PDF por lote.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBob } from "@/domain/money";
import { generateInternalBarcodesAction } from "@/features/inventory/actions";
import type { LabelQueueRow } from "../queries";

export function LabelsTray({ rows }: { rows: LabelQueueRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [size, setSize] = useState<"50x25" | "38x19">("50x25");
  const [pending, start] = useTransition();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const ids = [...selected];
  const missingCode = ids.filter(
    (id) => !rows.find((r) => r.variantId === id)?.barcode,
  );

  function generate() {
    if (missingCode.length === 0) return;
    start(async () => {
      const r = await generateInternalBarcodesAction({
        variantIds: missingCode,
      });
      if (r.ok) {
        toast.success(`${r.assigned ?? 0} código(s) interno(s) asignado(s)`);
        router.refresh();
      } else {
        toast.error(r.error ?? "Error");
      }
    });
  }

  function openPdf() {
    if (ids.length === 0) return;
    if (missingCode.length > 0) {
      toast.error("Generá los códigos internos que faltan primero");
      return;
    }
    window.open(
      `/panel/etiquetas/pdf?size=${size}&ids=${ids.join(",")}`,
      "_blank",
      "noopener",
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setSelected(
              selected.size === rows.length
                ? new Set()
                : new Set(rows.map((r) => r.variantId)),
            )
          }
        >
          {selected.size === rows.length ? "Ninguno" : "Todos"}
        </Button>
        <Select value={size} onValueChange={(v) => setSize(v as typeof size)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50x25">50 × 25 mm</SelectItem>
            <SelectItem value="38x19">38 × 19 mm</SelectItem>
          </SelectContent>
        </Select>
        {missingCode.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={generate}
          >
            Generar {missingCode.length} código(s) interno(s)
          </Button>
        )}
        <Button size="sm" disabled={ids.length === 0} onClick={openPdf}>
          Descargar PDF ({ids.length})
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-10 p-2" />
              <th className="p-2">Producto</th>
              <th className="p-2">Código</th>
              <th className="p-2 text-right">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center text-muted-foreground"
                >
                  Todas las variantes tienen código. 🎉
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.variantId}>
                <td className="p-2">
                  <Checkbox
                    checked={selected.has(r.variantId)}
                    onCheckedChange={() => toggle(r.variantId)}
                  />
                </td>
                <td className="p-2">
                  {r.variantLabel
                    ? `${r.productName} — ${r.variantLabel}`
                    : r.productName}
                </td>
                <td className="p-2 font-mono text-xs">
                  {r.barcode ?? (
                    <span className="text-muted-foreground">sin código</span>
                  )}
                </td>
                <td className="p-2 text-right tabular-nums">
                  {formatBob(r.basePriceBob)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
