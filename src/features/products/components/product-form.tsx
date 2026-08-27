"use client";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveProductAction } from "../actions";
import type { ProductInput } from "../schemas";

interface VariantRow {
  key: string;
  id?: string;
  label: string;
  sku: string;
  barcode: string;
  priceBs: string;
  costBs: string;
  minStock: string;
}

interface Category {
  id: string;
  name: string;
  depth: number;
}

export interface ProductFormValue {
  id?: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  trackStock: boolean;
  categoryIds: string[];
  variants: {
    id?: string;
    attributes?: Record<string, string>;
    sku: string;
    barcode: string;
    basePriceBob: number;
    costBob?: number;
    minStock: number;
  }[];
}

let counter = 0;
const newKey = () => `v${counter++}`;

function toRow(v?: ProductFormValue["variants"][number]): VariantRow {
  return {
    key: newKey(),
    id: v?.id,
    label: v?.attributes?.variante ?? "",
    sku: v?.sku ?? "",
    barcode: v?.barcode ?? "",
    priceBs: v ? (v.basePriceBob / 100).toString() : "",
    costBs: v?.costBob != null ? (v.costBob / 100).toString() : "",
    minStock: v ? String(v.minStock) : "0",
  };
}

export function ProductForm({
  initial,
  categories,
}: {
  initial?: ProductFormValue;
  categories: Category[];
}) {
  const router = useRouter();
  const formId = useId();
  const [pending, start] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [trackStock, setTrackStock] = useState(initial?.trackStock ?? true);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initial?.categoryIds ?? [],
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    initial?.variants.length ? initial.variants.map(toRow) : [toRow()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function patchVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((vs) =>
      vs.map((v) => (v.key === key ? { ...v, ...patch } : v)),
    );
  }

  function submit() {
    const payload: ProductInput = {
      id: initial?.id,
      name,
      slug: slug || undefined,
      description: description || undefined,
      isActive,
      trackStock,
      categoryIds,
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku || undefined,
        barcode: v.barcode || undefined,
        attributes: v.label ? { variante: v.label } : undefined,
        basePriceBob: v.priceBs,
        costBob: v.costBs || undefined,
        minStock: Number(v.minStock) || 0,
      })),
    };

    start(async () => {
      const r = await saveProductAction(payload);
      if (r.ok) {
        if (initial) {
          toast.success("Producto guardado");
          router.push("/panel/productos");
        } else {
          toast.success("Producto creado — agregá sus fotos");
          router.push(`/panel/productos/${r.id}`);
        }
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error ?? "No se pudo guardar");
      }
    });
  }

  return (
    <form
      id={formId}
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="se genera del nombre"
            />
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug}</p>
            )}
          </div>
          <div className="flex items-end gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">Visible en el catálogo</Label>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Switch
                id="trackStock"
                checked={trackStock}
                onCheckedChange={setTrackStock}
              />
              <Label htmlFor="trackStock">Controla stock</Label>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorías</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                id={`cat-${c.id}`}
                checked={categoryIds.includes(c.id)}
                onCheckedChange={(v) =>
                  setCategoryIds((ids) =>
                    v ? [...ids, c.id] : ids.filter((x) => x !== c.id),
                  )
                }
              />
              <Label
                htmlFor={`cat-${c.id}`}
                className={c.depth ? "text-muted-foreground" : "font-medium"}
              >
                {c.depth ? `— ${c.name}` : c.name}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Variantes y precio</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants((v) => [...v, toRow()])}
          >
            <Plus className="mr-1 size-4" /> Variante
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errors.variants && (
            <p className="text-sm text-destructive">{errors.variants}</p>
          )}
          {variants.map((v, i) => (
            <div
              key={v.key}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-6"
            >
              {variants.length > 1 && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Variante</Label>
                  <Input
                    value={v.label}
                    placeholder="ej. Talla M"
                    onChange={(e) =>
                      patchVariant(v.key, { label: e.target.value })
                    }
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>Precio (Bs)</Label>
                <Input
                  inputMode="decimal"
                  value={v.priceBs}
                  onChange={(e) =>
                    patchVariant(v.key, { priceBs: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Costo (Bs)</Label>
                <Input
                  inputMode="decimal"
                  value={v.costBs}
                  onChange={(e) =>
                    patchVariant(v.key, { costBs: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Código de barras</Label>
                <Input
                  value={v.barcode}
                  onChange={(e) =>
                    patchVariant(v.key, { barcode: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>SKU</Label>
                <Input
                  value={v.sku}
                  onChange={(e) => patchVariant(v.key, { sku: e.target.value })}
                />
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Stock mínimo</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v.minStock}
                    onChange={(e) =>
                      patchVariant(v.key, { minStock: e.target.value })
                    }
                    className="w-20"
                  />
                </div>
                {variants.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setVariants((vs) => vs.filter((x) => x.key !== v.key))
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
              {i === 0 && (
                <p className="text-xs text-muted-foreground sm:col-span-6">
                  El stock inicial se carga desde Inventario (fase siguiente) o
                  escaneando.
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {initial ? "Guardar cambios" : "Crear producto"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
