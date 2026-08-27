"use client";
// Registrar ingreso de mercadería (§14.1). Escaneo continuo: cada lectura agrega
// o incrementa una fila; si el código no existe, se crea el producto ahí mismo
// (§15.3, §19.1 "escaneo progresivo").
import { Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBob } from "@/domain/money";
import { ScanField } from "@/features/scanner/scan-field";
import {
  lookupScanAction,
  quickCreateFromScanAction,
  registerEntryAction,
} from "../actions";

interface Row {
  variantId: string;
  label: string;
  qty: number;
  unitCostBs: string;
}

export function EntryForm() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [pending, start] = useTransition();

  function addVariant(variantId: string, label: string) {
    setRows((prev) => {
      const hit = prev.find((r) => r.variantId === variantId);
      if (hit) {
        return prev.map((r) =>
          r.variantId === variantId ? { ...r, qty: r.qty + 1 } : r,
        );
      }
      return [...prev, { variantId, label, qty: 1, unitCostBs: "" }];
    });
  }

  function onScan(code: string) {
    start(async () => {
      const r = await lookupScanAction(code);
      if (r.found) {
        addVariant(
          r.variant.variantId,
          r.variant.variantLabel
            ? `${r.variant.productName} — ${r.variant.variantLabel}`
            : r.variant.productName,
        );
      } else {
        setPendingCode(code);
        setNewName("");
        setNewPrice("");
      }
    });
  }

  function createPending() {
    if (!pendingCode) return;
    start(async () => {
      const r = await quickCreateFromScanAction({
        barcode: pendingCode,
        name: newName,
        priceBs: newPrice,
      });
      if (r.ok && r.variant) {
        addVariant(r.variant.id, r.variant.productName);
        setPendingCode(null);
        toast.success(`"${r.variant.productName}" creado`);
      } else {
        toast.error(r.error ?? "No se pudo crear");
      }
    });
  }

  function submit() {
    if (rows.length === 0) return;
    start(async () => {
      const r = await registerEntryAction({
        note,
        lines: rows.map((row) => ({
          variantId: row.variantId,
          qty: row.qty,
          unitCostBob: row.unitCostBs || undefined,
        })),
      });
      if (r.ok) {
        toast.success("Ingreso registrado");
        setRows([]);
        setNote("");
        router.refresh();
      } else {
        toast.error(r.error ?? "Error");
      }
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <ScanField
        onScan={onScan}
        placeholder="Escaneá o escribí el código a ingresar"
      />

      {pendingCode && (
        <div className="rounded-lg border border-dashed p-4">
          <p className="mb-2 text-sm">
            El código <span className="font-mono">{pendingCode}</span> no
            existe. Creá el producto:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="qc-name">Nombre</Label>
              <Input
                id="qc-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="qc-price">Precio de venta (Bs)</Label>
              <Input
                id="qc-price"
                inputMode="decimal"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={pending} onClick={createPending}>
              Crear y agregar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPendingCode(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col divide-y rounded-lg border">
          {rows.map((row) => (
            <div key={row.variantId} className="flex items-center gap-3 p-3">
              <span className="flex-1 text-sm">{row.label}</span>
              <div className="flex items-center rounded-md border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.variantId === row.variantId
                          ? { ...r, qty: Math.max(1, r.qty - 1) }
                          : r,
                      ),
                    )
                  }
                  aria-label="Menos"
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center text-sm tabular-nums">
                  {row.qty}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.variantId === row.variantId
                          ? { ...r, qty: r.qty + 1 }
                          : r,
                      ),
                    )
                  }
                  aria-label="Más"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
              <Input
                className="w-28"
                inputMode="decimal"
                placeholder="Costo Bs"
                value={row.unitCostBs}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.variantId === row.variantId
                        ? { ...r, unitCostBs: e.target.value }
                        : r,
                    ),
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setRows((prev) =>
                    prev.filter((r) => r.variantId !== row.variantId),
                  )
                }
                aria-label="Quitar"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex justify-between p-3 text-sm text-muted-foreground">
            <span>{rows.reduce((s, r) => s + r.qty, 0)} unidades</span>
          </div>
        </div>
      )}

      <Textarea
        placeholder="Nota (proveedor, factura…)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <Button
        disabled={pending || rows.length === 0}
        onClick={submit}
        className="self-start"
      >
        Registrar ingreso
      </Button>
      <p className="text-xs text-muted-foreground">
        Formatea el costo como {formatBob(1234)} → escribí 12,34
      </p>
    </div>
  );
}
