"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  publishPostAction,
  savePostAction,
  unpublishPostAction,
} from "../../actions";
import type { PanelPost } from "../../panel-queries";
import { BlockEditor, type EditorBlock } from "./block-editor";

export function PostEditor({ post }: { post: PanelPost | null }) {
  const router = useRouter();
  const [id, setId] = useState(post?.id ?? null);
  const [status, setStatus] = useState(post?.status ?? "DRAFT");
  const [draftToken, setDraftToken] = useState(post?.draftToken ?? null);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverPath, setCoverPath] = useState(post?.coverPath ?? "");
  const [authorName, setAuthorName] = useState(post?.authorName ?? "");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    (post?.blocks ?? []).map((b) => ({
      key: crypto.randomUUID(),
      type: b.type,
      data: b.data,
    })),
  );
  const [pending, start] = useTransition();

  function save(): Promise<string | null> {
    return new Promise((resolve) => {
      start(async () => {
        const r = await savePostAction({
          id: id ?? undefined,
          title,
          slug,
          excerpt,
          coverPath,
          authorName,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
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
    const r = await publishPostAction(savedId);
    if (r.ok) {
      setStatus("PUBLISHED");
      toast.success("Entrada publicada");
      router.refresh();
    } else toast.error(r.error ?? "No se pudo publicar");
  }

  async function unpublish() {
    if (!id) return;
    const r = await unpublishPostAction(id);
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
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Autor</Label>
          <Input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Portada (path/URL)</Label>
          <Input
            value={coverPath}
            onChange={(e) => setCoverPath(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Resumen</Label>
          <Textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Etiquetas (separadas por coma)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">Cuerpo</h2>
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      </div>
    </div>
  );
}
