// Glass — URL pública de una imagen de producto. El bucket es público: no se
// necesita el service key para leer.

import { PRODUCT_IMAGES_BUCKET as BUCKET } from "@/storage/bucket";

export function publicImageUrl(path: string): string {
  if (
    path.startsWith("http") ||
    path.startsWith("data:") ||
    path.startsWith("/")
  ) {
    return path;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
