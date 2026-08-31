"use client";
// Glass — formulario por tipo de bloque (§11.1). Campos simples; el texto
// enriquecido usa el editor con barra. Las imágenes aceptan un `path`/URL
// (subida real: Fase 2).
import { Plus, X } from "lucide-react";
import { useId } from "react";
import { Field } from "@/components/field";
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
import type { RichText } from "@/domain/rich-text";
import type { BlockType } from "../../blocks/schemas";
import { RichTextEditor } from "./rich-text-editor";

type Data = Record<string, unknown>;

function upd(data: Data, patch: Data): Data {
  return { ...data, ...patch };
}

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Repeater<T>({
  label,
  items,
  empty,
  onChange,
  render,
}: {
  label: string;
  items: T[];
  empty: T;
  onChange: (v: T[]) => void;
  render: (item: T, set: (v: T) => void) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Etiqueta de grupo, no de un control: no lleva htmlFor. */}
      <p className="text-sm font-medium leading-none">{label}</p>
      {items.map((it, i) => (
        <div
          key={i}
          className="relative flex flex-col gap-2 rounded-md border p-3"
        >
          <button
            type="button"
            className="absolute right-2 top-2 text-muted-foreground"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X className="size-4" />
          </button>
          {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, empty])}
      >
        <Plus className="mr-1 size-4" /> Agregar
      </Button>
    </div>
  );
}

export function BlockForm({
  type,
  data,
  onChange,
}: {
  type: BlockType;
  data: unknown;
  onChange: (d: unknown) => void;
}) {
  const d = (data ?? {}) as Data;
  const set = (patch: Data) => onChange(upd(d, patch));

  if (type === "HERO") {
    const buttons = (d.buttons as { label: string; href: string }[]) ?? [];
    return (
      <div className="flex flex-col gap-3">
        <Text
          label="Título"
          value={(d.title as string) ?? ""}
          onChange={(v) => set({ title: v })}
        />
        <Text
          label="Subtítulo"
          value={(d.subtitle as string) ?? ""}
          onChange={(v) => set({ subtitle: v })}
        />
        <Text
          label="Imagen o video (path/URL)"
          value={(d.mediaPath as string) ?? ""}
          onChange={(v) => set({ mediaPath: v })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Pick
            label="Tipo de media"
            value={(d.mediaKind as string) ?? "image"}
            options={["image", "video"]}
            onChange={(v) => set({ mediaKind: v })}
          />
          <Pick
            label="Variante"
            value={(d.variant as string) ?? "center"}
            options={["center", "split", "minimal"]}
            onChange={(v) => set({ variant: v })}
          />
        </div>
        <Repeater
          label="Botones (máx. 2)"
          items={buttons.slice(0, 2)}
          empty={{ label: "", href: "/" }}
          onChange={(v) => set({ buttons: v.slice(0, 2) })}
          render={(b, s) => (
            <>
              <Text
                label="Texto"
                value={b.label}
                onChange={(x) => s({ ...b, label: x })}
              />
              <Text
                label="Enlace"
                value={b.href}
                onChange={(x) => s({ ...b, href: x })}
              />
            </>
          )}
        />
      </div>
    );
  }

  if (type === "PRODUCT_GRID") {
    return (
      <div className="flex flex-col gap-3">
        <Text
          label="Título (opcional)"
          value={(d.title as string) ?? ""}
          onChange={(v) => set({ title: v })}
        />
        <Pick
          label="Origen"
          value={(d.mode as string) ?? "featured"}
          options={["featured", "discounted", "category", "manual"]}
          onChange={(v) => set({ mode: v })}
        />
        {d.mode === "category" && (
          <Text
            label="Slug de categoría"
            value={(d.categorySlug as string) ?? ""}
            onChange={(v) => set({ categorySlug: v })}
          />
        )}
        {d.mode === "manual" && (
          <Text
            label="IDs de producto (separados por coma)"
            value={((d.productIds as string[]) ?? []).join(",")}
            onChange={(v) =>
              set({
                productIds: v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        )}
        <Text
          label="Cantidad"
          value={String((d.limit as number) ?? 8)}
          onChange={(v) => set({ limit: Number.parseInt(v, 10) || 8 })}
        />
      </div>
    );
  }

  if (type === "TEXT_MEDIA") {
    return (
      <div className="flex flex-col gap-3">
        <RichTextEditor
          label="Texto"
          value={(d.body as RichText) ?? []}
          onChange={(v) => set({ body: v })}
        />
        <Text
          label="Imagen (path/URL)"
          value={(d.imagePath as string) ?? ""}
          onChange={(v) => set({ imagePath: v })}
        />
        <Pick
          label="Posición de la imagen"
          value={(d.layout as string) ?? "media-right"}
          options={["media-right", "media-left"]}
          onChange={(v) => set({ layout: v })}
        />
      </div>
    );
  }

  if (type === "GALLERY") {
    const images = (d.images as { path: string; alt: string }[]) ?? [];
    return (
      <div className="flex flex-col gap-3">
        <Pick
          label="Columnas"
          value={String((d.columns as number) ?? 3)}
          options={["2", "3", "4"]}
          onChange={(v) => set({ columns: Number.parseInt(v, 10) })}
        />
        <Repeater
          label="Imágenes"
          items={images}
          empty={{ path: "", alt: "" }}
          onChange={(v) => set({ images: v })}
          render={(img, s) => (
            <>
              <Text
                label="Path/URL"
                value={img.path}
                onChange={(x) => s({ ...img, path: x })}
              />
              <Text
                label="Texto alternativo"
                value={img.alt}
                onChange={(x) => s({ ...img, alt: x })}
              />
            </>
          )}
        />
      </div>
    );
  }

  if (type === "TESTIMONIALS") {
    const items =
      (d.items as { quote: string; name: string; photoPath: string }[]) ?? [];
    return (
      <Repeater
        label="Testimonios"
        items={items}
        empty={{ quote: "", name: "", photoPath: "" }}
        onChange={(v) => set({ items: v })}
        render={(it, s) => (
          <>
            <Field label="Cita">
              <Textarea
                value={it.quote}
                onChange={(e) => s({ ...it, quote: e.target.value })}
              />
            </Field>
            <Text
              label="Nombre"
              value={it.name}
              onChange={(x) => s({ ...it, name: x })}
            />
            <Text
              label="Foto (path/URL)"
              value={it.photoPath}
              onChange={(x) => s({ ...it, photoPath: x })}
            />
          </>
        )}
      />
    );
  }

  if (type === "FAQ") {
    const items = (d.items as { q: string; a: RichText }[]) ?? [];
    return (
      <Repeater
        label="Preguntas"
        items={items}
        empty={{ q: "", a: [] }}
        onChange={(v) => set({ items: v })}
        render={(it, s) => (
          <>
            <Text
              label="Pregunta"
              value={it.q}
              onChange={(x) => s({ ...it, q: x })}
            />
            <RichTextEditor
              label="Respuesta"
              value={it.a ?? []}
              onChange={(x) => s({ ...it, a: x })}
            />
          </>
        )}
      />
    );
  }

  if (type === "MAP_CONTACT") {
    return (
      <div className="flex flex-col gap-3">
        <Text
          label="Dirección (deja vacío para usar la de ajustes)"
          value={(d.address as string) ?? ""}
          onChange={(v) => set({ address: v })}
        />
        <Text
          label="URL del mapa incrustado (OpenStreetMap)"
          value={(d.mapEmbedUrl as string) ?? ""}
          onChange={(v) => set({ mapEmbedUrl: v })}
        />
        <Check
          label="Mostrar horarios"
          value={d.showHours !== false}
          onChange={(v) => set({ showHours: v })}
        />
        <Check
          label="Mostrar WhatsApp"
          value={d.showWhatsapp !== false}
          onChange={(v) => set({ showWhatsapp: v })}
        />
      </div>
    );
  }

  if (type === "CTA_WHATSAPP") {
    return (
      <div className="flex flex-col gap-3">
        <Text
          label="Encabezado"
          value={(d.heading as string) ?? ""}
          onChange={(v) => set({ heading: v })}
        />
        <Text
          label="Texto del botón"
          value={(d.buttonLabel as string) ?? "Escribinos"}
          onChange={(v) => set({ buttonLabel: v })}
        />
        <Text
          label="Mensaje prellenado"
          value={(d.prefilledMessage as string) ?? ""}
          onChange={(v) => set({ prefilledMessage: v })}
        />
      </div>
    );
  }

  if (type === "POSTS") {
    return (
      <div className="flex flex-col gap-3">
        <Text
          label="Título"
          value={(d.title as string) ?? "Del blog"}
          onChange={(v) => set({ title: v })}
        />
        <Text
          label="Cantidad"
          value={String((d.limit as number) ?? 3)}
          onChange={(v) => set({ limit: Number.parseInt(v, 10) || 3 })}
        />
      </div>
    );
  }

  // BENTO
  const pieces =
    (d.pieces as {
      size: string;
      kind: string;
      ref: string;
      imagePath: string;
      stat?: { value: string; label: string };
      text?: RichText;
    }[]) ?? [];
  return (
    <Repeater
      label="Piezas del mosaico"
      items={pieces}
      empty={{ size: "S", kind: "text", ref: "", imagePath: "" }}
      onChange={(v) => set({ pieces: v })}
      render={(p, s) => (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Pick
              label="Tamaño"
              value={p.size}
              options={["S", "M", "L", "XL"]}
              onChange={(x) => s({ ...p, size: x })}
            />
            <Pick
              label="Tipo"
              value={p.kind}
              options={["product", "category", "image", "text", "stat"]}
              onChange={(x) => s({ ...p, kind: x })}
            />
          </div>
          {(p.kind === "product" || p.kind === "category") && (
            <Text
              label={
                p.kind === "product" ? "ID de producto" : "Slug de categoría"
              }
              value={p.ref}
              onChange={(x) => s({ ...p, ref: x })}
            />
          )}
          {p.kind === "image" && (
            <Text
              label="Path/URL"
              value={p.imagePath}
              onChange={(x) => s({ ...p, imagePath: x })}
            />
          )}
          {p.kind === "stat" && (
            <div className="grid grid-cols-2 gap-2">
              <Text
                label="Número"
                value={p.stat?.value ?? ""}
                onChange={(x) =>
                  s({ ...p, stat: { value: x, label: p.stat?.label ?? "" } })
                }
              />
              <Text
                label="Etiqueta"
                value={p.stat?.label ?? ""}
                onChange={(x) =>
                  s({ ...p, stat: { value: p.stat?.value ?? "", label: x } })
                }
              />
            </div>
          )}
          {p.kind === "text" && (
            <RichTextEditor
              label="Texto"
              value={p.text ?? []}
              onChange={(x) => s({ ...p, text: x })}
            />
          )}
        </>
      )}
    />
  );
}

function Pick({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
