// Glass — redimensión en el navegador antes de subir (§12.1). Cliente.
// Sube ~200 KB en vez de 4 MB y salva al dueño que carga 80 productos con datos.

export interface ResizedImage {
  blob: Blob;
  contentType: string;
  ext: string;
  width: number;
  height: number;
  /** Marcador 8×8 para next/image (§12.1). */
  blurDataUrl: string;
}

const MAX_PX = 1600;
const QUALITY = 0.8;

function supportsWebp(): boolean {
  const c = document.createElement("canvas");
  return c.toDataURL("image/webp").startsWith("data:image/webp");
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawScaled(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas no disponible");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, srcW, srcH, 0, 0, targetW, targetH);
  return canvas;
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob falló"))),
      type,
      quality,
    );
  });
}

export async function resizeImage(file: File): Promise<ResizedImage> {
  const bmp = await loadBitmap(file);
  const srcW = "width" in bmp ? bmp.width : 0;
  const srcH = "height" in bmp ? bmp.height : 0;
  const scale = Math.min(1, MAX_PX / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const canvas = drawScaled(bmp, srcW, srcH, w, h);
  const webp = supportsWebp();
  const contentType = webp ? "image/webp" : "image/jpeg";
  const blob = await toBlob(canvas, contentType, QUALITY);

  // blurDataURL: 8×8 del mismo canvas
  const tiny = drawScaled(canvas, w, h, 8, 8);
  const blurDataUrl = tiny.toDataURL("image/webp", 0.5);

  if ("close" in bmp) bmp.close();

  return {
    blob,
    contentType,
    ext: webp ? "webp" : "jpg",
    width: w,
    height: h,
    blurDataUrl,
  };
}
