"use client";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSettingsAction } from "../actions";

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

export interface SettingsFormValue {
  name: string;
  whatsappNumbers: { label: string; e164: string }[];
  minOrderBob: number | null;
  orderMessageTemplate: string | null;
  hours: Record<string, string>;
}

export function SettingsForm({ initial }: { initial: SettingsFormValue }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(initial.name);
  const [numbers, setNumbers] = useState(
    initial.whatsappNumbers.length
      ? initial.whatsappNumbers
      : [{ label: "Ventas", e164: "" }],
  );
  const [minOrder, setMinOrder] = useState(
    initial.minOrderBob != null ? (initial.minOrderBob / 100).toString() : "",
  );
  const [template, setTemplate] = useState(initial.orderMessageTemplate ?? "");
  const [hours, setHours] = useState<Record<string, string>>(
    initial.hours ?? {},
  );

  function save() {
    start(async () => {
      const r = await saveSettingsAction({
        name,
        whatsappNumbers: numbers.filter((n) => n.e164.trim()),
        minOrderBs: minOrder ? Number(minOrder) : undefined,
        orderMessageTemplate: template,
        hours,
      });
      if (r.ok) {
        toast.success("Ajustes guardados");
        router.refresh();
      } else {
        toast.error(r.error ?? "No se pudo guardar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Comercio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-sm flex-col gap-1.5">
            <Label htmlFor="s-name">Nombre</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>WhatsApp</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNumbers((n) => [...n, { label: "", e164: "" }])}
          >
            <Plus className="mr-1 size-4" /> Número
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {numbers.map((n, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lista editable local
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Etiqueta (Ventas, Repuestos…)"
                value={n.label}
                onChange={(e) =>
                  setNumbers((ns) =>
                    ns.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
              />
              <Input
                placeholder="+59170000000"
                value={n.e164}
                onChange={(e) =>
                  setNumbers((ns) =>
                    ns.map((x, j) =>
                      j === i ? { ...x, e164: e.target.value } : x,
                    ),
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNumbers((ns) => ns.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="s-min">
              Pedido mínimo (Bs, vacío = sin mínimo)
            </Label>
            <Input
              id="s-min"
              inputMode="decimal"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-tpl">Encabezado del mensaje de WhatsApp</Label>
            <Textarea
              id="s-tpl"
              rows={2}
              placeholder="Hola {nombreComercio}! Quiero hacer este pedido:"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usá <code>{"{nombreComercio}"}</code> donde vaya el nombre.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horarios</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {DAYS.map((d) => (
            <div key={d.key} className="flex items-center gap-2">
              <Label className="w-24 shrink-0">{d.label}</Label>
              <Input
                placeholder="08:00-18:30 (vacío = cerrado)"
                value={hours[d.key] ?? ""}
                onChange={(e) =>
                  setHours((h) => ({ ...h, [d.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="self-start" onClick={save} disabled={pending}>
        Guardar ajustes
      </Button>
    </div>
  );
}
