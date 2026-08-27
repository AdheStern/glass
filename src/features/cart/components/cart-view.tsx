"use client";
import { Copy, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatBob } from "@/domain/money";
import { createOrderAction } from "@/features/orders/actions";
import { cart, useCart } from "../cart-store";
import { isOpenNow } from "../hours";

export interface CartConfig {
  siteName: string;
  minOrderBob: number | null;
  whatsappNumbers: { label: string; e164: string }[];
  hours: Record<string, string>;
}

export function CartView({ config }: { config: CartConfig }) {
  const lines = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [waLabel, setWaLabel] = useState(
    config.whatsappNumbers[0]?.label ?? "",
  );
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{
    folio: string;
    waUrl?: string;
    message: string;
    warnings: string[];
  } | null>(null);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.unitHintBob * l.qty, 0),
    [lines],
  );
  const belowMin = config.minOrderBob != null && subtotal < config.minOrderBob;
  const open = isOpenNow(config.hours);

  function submit() {
    start(async () => {
      const r = await createOrderAction({
        items: lines.map((l) => ({
          variantId: l.variantId,
          qty: l.qty,
          note: l.note,
        })),
        customerName: name,
        customerPhone: phone,
        note,
        whatsappLabel: waLabel || undefined,
        source: "carrito",
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo crear el pedido");
        return;
      }
      setDone({
        folio: r.folio as string,
        waUrl: r.waUrl,
        message: r.message ?? "",
        warnings: r.warnings ?? [],
      });
      cart.clear();
      if (r.waUrl) window.open(r.waUrl, "_blank", "noopener");
    });
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedido {done.folio} creado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {done.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              {done.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              <p className="mt-1">
                El comercio confirma disponibilidad al responder.
              </p>
            </div>
          )}
          <p className="text-sm text-black/60">
            Si no se abrió WhatsApp, copiá el mensaje o entrá al detalle del
            pedido.
          </p>
          <div className="flex flex-wrap gap-2">
            {done.waUrl && (
              <Button asChild>
                <a href={done.waUrl} target="_blank" rel="noopener">
                  Abrir WhatsApp
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(done.message);
                toast.success("Mensaje copiado");
              }}
            >
              <Copy className="mr-2 size-4" /> Copiar mensaje
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/pedido/${done.folio}`}>Ver pedido</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-black/60">Tu carrito está vacío.</p>
        <Button asChild>
          <Link href="/catalogo">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        {lines.map((l) => (
          <Card key={l.variantId}>
            <CardContent className="flex flex-col gap-2 py-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/producto/${l.slug}`}
                  className="font-medium hover:underline"
                >
                  {l.name}
                </Link>
                <button
                  type="button"
                  onClick={() => cart.remove(l.variantId)}
                  aria-label="Quitar"
                >
                  <Trash2 className="size-4 text-black/40" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center rounded-lg border">
                  <button
                    type="button"
                    className="p-1.5"
                    onClick={() => cart.setQty(l.variantId, l.qty - 1)}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center tabular-nums">{l.qty}</span>
                  <button
                    type="button"
                    className="p-1.5"
                    onClick={() => cart.setQty(l.variantId, l.qty + 1)}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <span className="tabular-nums font-medium">
                  {formatBob(l.unitHintBob * l.qty)}
                </span>
              </div>
              <Input
                placeholder="Nota (ej. talla M, sin cebolla)"
                value={l.note ?? ""}
                onChange={(e) => cart.setNote(l.variantId, e.target.value)}
                className="h-8 text-sm"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total aprox.</span>
              <span className="tabular-nums">{formatBob(subtotal)}</span>
            </div>
            {belowMin && (
              <p className="text-sm text-destructive">
                Pedido mínimo: Bs {((config.minOrderBob ?? 0) / 100).toFixed(2)}
              </p>
            )}
            {!open && (
              <p className="text-sm text-amber-700">
                Ahora está cerrado. Podés dejar el pedido igual; lo verán al
                abrir.
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-name">Tu nombre (opcional)</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-phone">Tu WhatsApp (opcional)</Label>
              <Input
                id="c-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-note">Nota general (opcional)</Label>
              <Textarea
                id="c-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {config.whatsappNumbers.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label>Escribir a</Label>
                <Select value={waLabel} onValueChange={setWaLabel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.whatsappNumbers.map((n) => (
                      <SelectItem key={n.label} value={n.label}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button size="lg" onClick={submit} disabled={pending || belowMin}>
              {pending ? "Creando pedido…" : "Pedir por WhatsApp"}
            </Button>
            {config.whatsappNumbers.length === 0 && (
              <p className="text-xs text-destructive">
                El comercio aún no cargó un número de WhatsApp.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
