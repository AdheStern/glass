// Glass — almacenamiento de medios sobre Supabase Storage (ADR-09 adaptado).
// El redimensionado en el navegador y las variantes AVIF son Fase 2; aquí solo
// el cliente y las operaciones básicas de subida/URL.
import "server-only";
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "product-images";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("glass/storage: faltan credenciales de Supabase");
  return createClient(url, key, { auth: { persistSession: false } });
}

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function uploadImage(
  path: string,
  body: ArrayBuffer | Uint8Array | Blob,
  contentType: string,
): Promise<{ path: string }> {
  if (!ALLOWED.has(contentType)) {
    throw new Error(`glass/storage: tipo no permitido (${contentType})`);
  }
  const { error } = await serviceClient()
    .storage.from(BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  return { path };
}

export function publicUrl(path: string): string {
  return serviceClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function signedUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await serviceClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
