"use client";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  archiveDiscountAction,
  saveDiscountAction,
  toggleDiscountAction,
} from "../actions";
import type { DiscountRow } from "../queries";
import type { DiscountInput } from "../schemas";

type FormState = Partial<DiscountInput> & {
  kind: "PERCENT" | "AMOUNT";
  scope: DiscountInput["scope"];
};

const EMPTY: FormState = {
  name: "",
  scope: "CATEGORY",
  kind: "PERCENT",
  isActive: true,
};

export function DiscountManager({
  rows,
  categories,
  loadForEdit,
}: {
  rows: DiscountRow[];
  categories: { id: string; name: string }[];
  loadForEdit: (id: string) => Promise<FormState | null>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, start] = useTransition();

  const set = (patch: Partial<FormState>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  function openEdit(id: string) {
    start(async () => {
      const data = await loadForEdit(id);
      if (data) setForm(data);
    });
  }

  function save() {
    if (!form) return;
    start(async () => {
      const r = await saveDiscountAction(form as DiscountInput);
      if (r.ok) {
        toast[r.error ? "warning" : "success"](r.error ?? "Descuento guardado");
        setForm(null);
        router.refresh();
      } else {
        toast.error(r.error ?? "No se pudo guardar");
      }
    });
  }

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else toast.error(r.error ?? "Error");
    });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => setForm({ ...EMPTY })}>
          <Plus className="mr-1 size-4" /> Nuevo descuento
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Alcance</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sin descuentos.
                </TableCell>
              </TableRow>
            )}
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.scope}</TableCell>
                <TableCell className="text-muted-foreground">
                  {d.target}
                </TableCell>
                <TableCell className="tabular-nums">{d.value}</TableCell>
                <TableCell className="text-muted-foreground">
                  {d.window}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={d.isActive}
                    onCheckedChange={(v) =>
                      act(() => toggleDiscountAction(d.id, v))
                    }
                  />
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(d.id)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => act(() => archiveDiscountAction(d.id))}
                  >
                    Archivar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form?.id ? "Editar descuento" : "Nuevo descuento"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-name">Nombre</Label>
                <Input
                  id="d-name"
                  value={form.name ?? ""}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Alcance</Label>
                  <Select
                    value={form.scope}
                    onValueChange={(v) =>
                      set({ scope: v as FormState["scope"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GLOBAL">Todo el catálogo</SelectItem>
                      <SelectItem value="CATEGORY">Categoría</SelectItem>
                      <SelectItem value="PRODUCT">Productos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(v) =>
                      set({ kind: v as "PERCENT" | "AMOUNT" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Porcentaje</SelectItem>
                      <SelectItem value="AMOUNT">Monto fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.kind === "PERCENT" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="d-pct">Porcentaje (%)</Label>
                  <Input
                    id="d-pct"
                    type="number"
                    min={1}
                    max={90}
                    value={form.percent ?? ""}
                    onChange={(e) => set({ percent: Number(e.target.value) })}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="d-amt">Monto (Bs)</Label>
                  <Input
                    id="d-amt"
                    inputMode="decimal"
                    value={form.amountBs ?? ""}
                    onChange={(e) => set({ amountBs: Number(e.target.value) })}
                  />
                </div>
              )}

              {form.scope === "CATEGORY" && (
                <div className="flex flex-col gap-1.5">
                  <Label>Categoría</Label>
                  <Select
                    value={form.categoryId ?? ""}
                    onValueChange={(v) => set({ categoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.scope === "PRODUCT" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="d-refs">Códigos o SKU de los productos</Label>
                  <Textarea
                    id="d-refs"
                    rows={3}
                    placeholder="Uno por línea o separados por coma"
                    value={form.productRefs ?? ""}
                    onChange={(e) => set({ productRefs: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="d-start">Desde</Label>
                  <Input
                    id="d-start"
                    type="date"
                    value={form.startsAt ?? ""}
                    onChange={(e) => set({ startsAt: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="d-end">Hasta</Label>
                  <Input
                    id="d-end"
                    type="date"
                    value={form.endsAt ?? ""}
                    onChange={(e) => set({ endsAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="d-active"
                  checked={form.isActive ?? true}
                  onCheckedChange={(v) => set({ isActive: v })}
                />
                <Label htmlFor="d-active">Activo</Label>
                {form.scope === "GLOBAL" && (
                  <Badge variant="outline" className="ml-auto">
                    Afecta a todo el catálogo
                  </Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={pending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
