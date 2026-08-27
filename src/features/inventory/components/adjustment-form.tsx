"use client";
// Ajuste manual o merma (§14.1). Nota obligatoria. La existencia negativa que
// resulte es una alerta, no un bloqueo (§1.2).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScanField } from "@/features/scanner/scan-field";
import { lookupScanAction, registerAdjustmentAction } from "../actions";

type Kind = "MERMA" | "AJUSTE";

export function AdjustmentForm() {
  const router = useRouter();
  const [variant, setVariant] = useState<{
    id: string;
    label: string;
    onHand: number;
  } | null>(null);
  const [kind, setKind] = useState<Kind>("MERMA");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function onScan(code: string) {
    start(async () => {
      const r = await lookupScanAction(code);
      if (r.found) {
        setVariant({
          id: r.variant.variantId,
          label: r.variant.variantLabel
            ? `${r.variant.productName} — ${r.variant.variantLabel}`
            : r.variant.productName,
          onHand: r.variant.onHand,
        });
      } else {
        toast.error("No se encontró ese código");
      }
    });
  }

  function submit() {
    if (!variant) return;
    const n = Number(qty);
    if (!Number.isInteger(n) || n === 0) {
      toast.error("Cantidad inválida");
      return;
    }
    const signed = kind === "MERMA" ? -Math.abs(n) : n;
    start(async () => {
      const r = await registerAdjustmentAction({
        variantId: variant.id,
        kind,
        qty: signed,
        note,
      });
      if (r.ok) {
        toast.success(
          kind === "MERMA" ? "Merma registrada" : "Ajuste registrado",
        );
        setVariant(null);
        setQty("");
        setNote("");
        router.refresh();
      } else {
        toast.error(r.error ?? "Error");
      }
    });
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <ScanField onScan={onScan} placeholder="Escaneá el producto a ajustar" />

      {variant && (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">{variant.label}</p>
            <p className="text-xs text-muted-foreground">
              Existencia actual: {variant.onHand}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MERMA">
                  Merma (roto, vencido, robo)
                </SelectItem>
                <SelectItem value="AJUSTE">Ajuste (corrección)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="adj-qty">
              {kind === "MERMA"
                ? "Unidades perdidas"
                : "Diferencia (+ suma, − resta)"}
            </Label>
            <Input
              id="adj-qty"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={kind === "MERMA" ? "3" : "-2"}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="adj-note">Nota (obligatoria)</Label>
            <Textarea
              id="adj-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button disabled={pending} onClick={submit} className="self-start">
            Registrar
          </Button>
        </div>
      )}
    </div>
  );
}
