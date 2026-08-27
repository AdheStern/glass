"use client";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/features/auth/supabase-client";
import { publicImageUrl } from "@/features/catalog/image";
import { PRODUCT_IMAGES_BUCKET } from "@/storage/bucket";
import {
  attachImageAction,
  createUploadUrlAction,
  removeImageAction,
  reorderImagesAction,
} from "../actions";
import { resizeImage } from "../resize";

export interface ManagedImage {
  id: string;
  path: string;
  alt: string | null;
  blurDataUrl: string | null;
}

export function ImageManager({
  productId,
  productName,
  initial,
}: {
  productId: string;
  productName: string;
  initial: ManagedImage[];
}) {
  const [images, setImages] = useState<ManagedImage[]>(initial);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();

  async function handleFiles(files: FileList) {
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const resized = await resizeImage(file);
        const target = await createUploadUrlAction(productId, resized.ext);

        const { error } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .uploadToSignedUrl(target.path, target.token, resized.blob, {
            contentType: resized.contentType,
          });
        if (error) throw error;

        const r = await attachImageAction({
          productId,
          path: target.path,
          alt: productName,
          blurDataUrl: resized.blurDataUrl,
        });
        if (!r.ok || !r.id) throw new Error(r.error ?? "No se pudo adjuntar");
        setImages((imgs) => [
          ...imgs,
          {
            id: r.id as string,
            path: target.path,
            alt: productName,
            blurDataUrl: resized.blurDataUrl,
          },
        ]);
      }
      toast.success("Fotos subidas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...images];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setImages(next);
    start(async () => {
      await reorderImagesAction(
        productId,
        next.map((i) => i.id),
      );
    });
  }

  function remove(id: string) {
    setImages((imgs) => imgs.filter((i) => i.id !== id));
    start(async () => {
      await removeImageAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-lg border"
          >
            <Image
              src={publicImageUrl(img.path)}
              alt={img.alt ?? productName}
              fill
              unoptimized
              sizes="120px"
              className="object-cover"
              placeholder={img.blurDataUrl ? "blur" : "empty"}
              blurDataURL={img.blurDataUrl ?? undefined}
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="text-white"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(img.id)}
                className="text-white"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="text-white"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">
                Principal
              </span>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-accent"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ImagePlus className="size-5" />
          )}
          <span className="text-xs">Agregar</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground">
        Fondo liso y luz de día. Se recorta a cuadrado y se reduce en tu
        teléfono antes de subir (§12).
      </p>
    </div>
  );
}
