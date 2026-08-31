// Glass — URL pública de una imagen de producto. El bucket es público: no se
// necesita el service key para leer.

import { PRODUCT_IMAGES_BUCKET as BUCKET } from "@/storage/bucket";

/** Imagen común mientras no haya fotos reales cargadas (acordado con el cliente). */
export const PLACEHOLDER_IMAGE = "/producto-placeholder.svg";

export function publicImageUrl(path: string): string {
  if (
    path.startsWith("http") ||
    path.startsWith("data:") ||
    path.startsWith("/")
  ) {
    return path;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return PLACEHOLDER_IMAGE; // sin Storage configurado
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
