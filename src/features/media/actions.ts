"use server";
// Glass — camino de la imagen (§12). El navegador recorta/redimensiona y sube
// directo a Storage con una URL firmada; el servidor solo registra la fila.
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";
import {
  createSignedUpload,
  deleteObject,
  ensureBucket,
} from "@/storage/supabase-storage";

export interface UploadTarget {
  path: string;
  token: string;
  signedUrl: string;
}

export async function createUploadUrlAction(
  productId: string,
  ext: string,
): Promise<UploadTarget> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR", "EDITOR");
  await ensureBucket();
  const safeExt = /^(webp|jpg|jpeg|png|avif)$/.test(ext) ? ext : "webp";
  const path = `products/${productId}/${crypto.randomUUID()}.${safeExt}`;
  return createSignedUpload(path);
}

const AttachSchema = z.object({
  productId: z.string(),
  path: z.string(),
  alt: z.string().trim().max(160),
  blurDataUrl: z.string().startsWith("data:image/"),
});

export async function attachImageAction(
  input: z.input<typeof AttachSchema>,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR", "EDITOR");
  const parsed = AttachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { productId, path, alt, blurDataUrl } = parsed.data;

  const count = await prisma.productImage.count({ where: { productId } });
  const img = await prisma.productImage.create({
    data: { productId, path, alt: alt || null, blurDataUrl, position: count },
  });

  revalidateTag("catalog", "max");
  revalidateTag(`product:${productId}`, "max");
  return { ok: true, id: img.id };
}

export async function removeImageAction(
  imageId: string,
): Promise<{ ok: boolean }> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR", "EDITOR");
  const img = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!img) return { ok: true };
  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteObject(img.path).catch(() => {});
  revalidateTag("catalog", "max");
  revalidateTag(`product:${img.productId}`, "max");
  return { ok: true };
}

export async function reorderImagesAction(
  productId: string,
  orderedIds: string[],
): Promise<{ ok: boolean }> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR", "EDITOR");
  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.productImage.update({ where: { id }, data: { position } }),
    ),
  );
  revalidateTag("catalog", "max");
  revalidateTag(`product:${productId}`, "max");
  return { ok: true };
}
