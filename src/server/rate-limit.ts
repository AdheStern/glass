import "server-only";
// Glass — límite de peticiones (§21). Ventana fija en memoria del proceso.
// Cada comercio corre en su propia instancia, así que un Map basta para frenar
// el abuso obvio (spam de pedidos, raspado de búsqueda). El límite por IP a
// escala de infraestructura vive en el proxy de Coolify.
import { headers } from "next/headers";
import { type Bucket, fixedWindow } from "@/domain/rate-limit";

const store = new Map<string, Bucket>();

function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [k, b] of store) if (now >= b.resetAt) store.delete(k);
}

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
}

/** `key` ya calificado por acción (p. ej. `order:1.2.3.4`). */
export function hit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const r = fixedWindow(store.get(key), now, limit, windowMs);
  store.set(key, r.bucket);
  return { ok: r.allowed, retryAfterSec: Math.ceil(r.retryAfterMs / 1000) };
}

/** IP del cliente a partir de las cabeceras del proxy. Opta por render dinámico. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Atajo: limita `action` por IP. */
export async function limitByIp(
  action: string,
  limit: number,
  windowMs: number,
): Promise<RateResult> {
  const ip = await clientIp();
  return hit(`${action}:${ip}`, limit, windowMs);
}
