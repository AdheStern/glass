// Glass — imágenes de siembra. Fase 0: un pool corto de gradientes deterministas
// subidos una sola vez a Supabase Storage; los productos los referencian por
// turno. Fase 1 los sustituye por fotos de dominio público (Openverse/Wikimedia)
// para probar el presupuesto de rendimiento de verdad (§20).

const HUES = [8, 25, 55, 95, 150, 175, 190, 210, 235, 265, 285, 320, 340];

function gradientSvg(hue: number): string {
  const h2 = (hue + 40) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 62%)"/>
<stop offset="1" stop-color="hsl(${h2} 65% 42%)"/></linearGradient></defs>
<rect width="800" height="800" fill="url(#g)"/></svg>`;
}

export interface ImageUploader {
  upload(path: string, svg: string): Promise<void>;
}

/** Sube a Supabase Storage si hay credenciales; si no, no-op (deja el path). */
export async function makeUploader(): Promise<ImageUploader> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "product-images";

  if (!url || !key) {
    console.warn("glass/seed: sin credenciales de Storage, se omite la subida de imágenes");
    return { upload: async () => {} };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, { auth: { persistSession: false } });
  await client.storage.createBucket(bucket, { public: true }).catch(() => {});

  return {
    upload: async (path, svg) => {
      const { error } = await client.storage
        .from(bucket)
        .upload(path, new Blob([svg], { type: "image/svg+xml" }), {
          contentType: "image/svg+xml",
          upsert: true,
        });
      if (error) throw error;
    },
  };
}

/** Sube el pool una vez y devuelve sus rutas (para asignación por turno). */
export async function seedImagePool(uploader: ImageUploader): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 0; i < HUES.length; i++) {
    const path = `pool/${i}.svg`;
    await uploader.upload(path, gradientSvg(HUES[i]));
    paths.push(path);
  }
  return paths;
}
