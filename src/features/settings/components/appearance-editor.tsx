"use client";
// Glass — editor de apariencia (§10.3). Controles curados + vista previa en vivo
// del catálogo real dentro de un iframe. El color se aplica al arrastrar (sin
// recargar); los cambios estructurales recargan el iframe con la selección nueva.
import { formatCss, formatHex, oklch } from "culori";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PREVIEW_MESSAGE_TYPE } from "@/features/catalog/components/preview-bridge";
import { CARD_PRESET_NAMES, type CardPresetName } from "@/theme/card-presets";
import { contrastRatio, deriveTokens, parseBrandColor } from "@/theme/derive";
import {
  HOME_LAYOUT_NAMES,
  type HomeLayoutName,
  PRESET_LABELS,
  PRESET_NAMES,
  type PresetName,
} from "@/theme/presets";
import { buildPreviewCss } from "@/theme/preview";
import {
  type AppearanceInput,
  saveAppearanceAction,
} from "../appearance-actions";

const CARD_LABELS: Record<CardPresetName, string> = {
  NITIDA: "Nítida",
  SUAVE: "Suave",
  EDITORIAL: "Editorial",
  COMPACTA: "Compacta",
};
const HOME_LABELS: Record<HomeLayoutName, string> = {
  HERO: "Héroe con foto",
  BENTO: "Bento",
  CAROUSEL: "Carrusel de categorías",
  DIRECTO: "Catálogo directo",
  EDITORIAL: "Editorial",
};
const DENSITY_LABELS = { COMODA: "Cómoda", COMPACTA: "Compacta" } as const;

export interface AppearanceValue {
  themePreset: PresetName;
  cardPreset: CardPresetName;
  density: "COMODA" | "COMPACTA";
  homeLayout: HomeLayoutName;
  brandColor: string;
}

function toHex(css: string): string {
  return (
    formatHex(oklch(css) ?? { mode: "oklch", l: 0.62, c: 0.17, h: 25 }) ??
    "#cc4433"
  );
}

export function AppearanceEditor({ initial }: { initial: AppearanceValue }) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState<AppearanceValue>(initial);
  const dirty = useMemo(
    () => JSON.stringify(v) !== JSON.stringify(initial),
    [v, initial],
  );

  const previewSrc = useMemo(() => {
    const q = new URLSearchParams({
      preset: v.themePreset,
      card: v.cardPreset,
      home: v.homeLayout,
      density: v.density,
      color: v.brandColor,
    });
    return `/apariencia-preview?${q.toString()}`;
  }, [v]);

  // Cambios estructurales: recargar el iframe con la selección nueva.
  // (El color no está en las deps: se aplica por postMessage sin recargar.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: color va por postMessage
  useEffect(() => {
    const frame = iframeRef.current;
    if (frame) frame.src = previewSrc;
  }, [v.themePreset, v.cardPreset, v.homeLayout, v.density]);

  const pushColor = useCallback(
    (color: string) => {
      const frame = iframeRef.current?.contentWindow;
      if (!frame) return;
      frame.postMessage(
        {
          type: PREVIEW_MESSAGE_TYPE,
          css: buildPreviewCss({
            brandColor: color,
            preset: v.themePreset,
            density: v.density,
          }),
        },
        window.location.origin,
      );
    },
    [v.themePreset, v.density],
  );

  function setColor(next: string) {
    setV((s) => ({ ...s, brandColor: next }));
    if (oklch(next)) pushColor(next);
  }

  // Contraste (§10, "AA garantizado por construcción"): mostramos las cifras.
  const contrast = useMemo(() => {
    const t = deriveTokens(parseBrandColor(v.brandColor), v.themePreset);
    const onBrand = contrastRatio(t["--brand"], t["--on-brand"]);
    const body = contrastRatio(t["--surface"], t["--ink"]);
    return { onBrand, body };
  }, [v.brandColor, v.themePreset]);
  const aaOk = contrast.onBrand >= 4.5 && contrast.body >= 4.5;

  async function save() {
    setSaving(true);
    const payload: AppearanceInput = {
      themePreset: v.themePreset,
      cardPreset: v.cardPreset,
      density: v.density,
      homeLayout: v.homeLayout,
      brandColor: oklch(v.brandColor)
        ? (formatCss(oklch(v.brandColor)) ?? v.brandColor)
        : v.brandColor,
    };
    const r = await saveAppearanceAction(payload);
    setSaving(false);
    if (r.ok) {
      toast.success("Apariencia guardada");
      router.refresh();
    } else {
      toast.error(r.error ?? "No se pudo guardar");
    }
  }

  const chip = (on: boolean) =>
    `rounded-lg border px-3 py-2 text-sm transition-colors ${
      on
        ? "border-foreground bg-foreground text-background"
        : "border-border hover:border-foreground/40"
    }`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Color de marca</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <input
                aria-label="Selector de color de marca"
                type="color"
                value={toHex(v.brandColor)}
                onChange={(e) =>
                  setColor(formatCss(oklch(e.target.value)) ?? e.target.value)
                }
                className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
              />
              <Input
                aria-label="Color de marca (CSS)"
                value={v.brandColor}
                onChange={(e) => setColor(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <p
              className={`text-xs ${aaOk ? "text-emerald-600" : "text-destructive"}`}
            >
              {aaOk ? "Contraste AA: cumple" : "Contraste AA: no cumple"} ·
              texto sobre marca {contrast.onBrand.toFixed(1)}:1 · cuerpo{" "}
              {contrast.body.toFixed(1)}:1
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tema base</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {PRESET_NAMES.map((p) => (
              <button
                key={p}
                type="button"
                className={chip(v.themePreset === p)}
                onClick={() => setV((s) => ({ ...s, themePreset: p }))}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forma de tarjeta</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {CARD_PRESET_NAMES.map((c) => (
              <button
                key={c}
                type="button"
                className={chip(v.cardPreset === c)}
                onClick={() => setV((s) => ({ ...s, cardPreset: c }))}
              >
                {CARD_LABELS[c]}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Densidad</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {(["COMODA", "COMPACTA"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={chip(v.density === d)}
                onClick={() => setV((s) => ({ ...s, density: d }))}
              >
                {DENSITY_LABELS[d]}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {HOME_LAYOUT_NAMES.map((h) => (
              <button
                key={h}
                type="button"
                className={chip(v.homeLayout === h)}
                onClick={() => setV((s) => ({ ...s, homeLayout: h }))}
              >
                {HOME_LABELS[h]}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          {dirty && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={() => setV(initial)}
            >
              Descartar
            </button>
          )}
        </div>
      </div>

      <div className="min-h-[600px] overflow-hidden rounded-xl border border-border">
        <iframe
          ref={iframeRef}
          title="Vista previa del catálogo"
          src={previewSrc}
          className="h-full min-h-[600px] w-full"
        />
      </div>
    </div>
  );
}
