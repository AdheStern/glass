"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  publishPageAction,
  savePageAction,
  unpublishPageAction,
} from "../../actions";
import type { PanelPage } from "../../panel-queries";
import { BlockEditor, type EditorBlock } from "./block-editor";

export function PageEditor({ page }: { page: PanelPage | null }) {
  const router = useRouter();
  const [id, setId] = useState(page?.id ?? null);
  const [status, setStatus] = useState(page?.status ?? "DRAFT");
  const [draftToken, setDraftToken] = useState(page?.draftToken ?? null);
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [metaTitle, setMetaTitle] = useState(page?.metaTitle ?? "");
  const [metaDesc, setMetaDesc] = useState(page?.metaDesc ?? "");
  const [isHome, setIsHome] = useState(page?.isHome ?? false);
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    (page?.blocks ?? []).map((b) => ({
      key: crypto.randomUUID(),
      type: b.type,
      data: b.data,
    })),
  );
  const [pending, start] = useTransition();

  function save(): Promise<string | null> {
    return new Promise((resolve) => {
      start(async () => {
        const r = await savePageAction({
          id: id ?? undefined,
          title,
          slug,
          metaTitle,
          metaDesc,
          isHome,
          blocks: blocks.map((b) => ({ type: b.type, data: b.data })),
        });
        if (r.ok && r.id) {
          setId(r.id);
          if (r.draftToken) setDraftToken(r.draftToken);
          toast.success("Guardado");
          resolve(r.id);
        } else {
          toast.error(r.error ?? "No se pudo guardar");
          resolve(null);
        }
      });
    });
  }

  async function publish() {
    const savedId = await save();
    if (!savedId) return;
    const r = await publishPageAction(savedId);
    if (r.ok) {
      setStatus("PUBLISHED");
      toast.success("Página publicada");
      router.refresh();
    } else toast.error(r.error ?? "No se pudo publicar");
  }

  async function unpublish() {
    if (!id) return;
    const r = await unpublishPageAction(id);
    if (r.ok) {
      setStatus("DRAFT");
      toast.success("Pasó a borrador");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {status === "PUBLISHED" ? "Publicada" : "Borrador"}
        </span>
        <div className="ml-auto flex gap-2">
          {draftToken && (
            <Button asChild variant="ghost" size="sm">
              <a
                href={`/borrador/${draftToken}`}
                target="_blank"
                rel="noopener"
              >
                Abrir vista previa
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => save()}
          >
            Guardar
          </Button>
          {status === "PUBLISHED" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={unpublish}
            >
              Despublicar
            </Button>
          ) : (
            <Button size="sm" disabled={pending} onClick={publish}>
              Publicar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Slug (opcional)</Label>
          <Input
            value={slug}
            placeholder="se genera del título"
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Título SEO</Label>
          <Input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Descripción SEO</Label>
          <Textarea
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isHome}
          onChange={(e) => setIsHome(e.target.checked)}
        />
        Usar esta página como portada del sitio (<code>/</code>)
      </label>

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">Bloques</h2>
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      </div>
    </div>
  );
}
