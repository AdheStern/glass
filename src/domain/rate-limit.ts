// Glass — núcleo puro del límite de peticiones (§21). Ventana fija. El estado y
// las cabeceras HTTP viven en src/server/rate-limit.ts.

export interface Bucket {
  count: number;
  resetAt: number;
}

/** Decide y devuelve el bucket actualizado. `now` en ms. */
export function fixedWindow(
  bucket: Bucket | undefined,
  now: number,
  limit: number,
  windowMs: number,
): { allowed: boolean; bucket: Bucket; retryAfterMs: number } {
  if (!bucket || now >= bucket.resetAt) {
    return {
      allowed: true,
      bucket: { count: 1, resetAt: now + windowMs },
      retryAfterMs: 0,
    };
  }
  if (bucket.count >= limit) {
    return { allowed: false, bucket, retryAfterMs: bucket.resetAt - now };
  }
  return {
    allowed: true,
    bucket: { count: bucket.count + 1, resetAt: bucket.resetAt },
    retryAfterMs: 0,
  };
}
