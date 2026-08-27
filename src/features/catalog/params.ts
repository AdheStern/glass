// Glass — filtros y orden del catálogo viven en la URL (§7.3): compartibles por
// WhatsApp. Este módulo traduce searchParams ↔ estado.
import type { Availability, CatalogFilters, CatalogSort } from "./types";

export type SearchParams = Record<string, string | string[] | undefined>;

const SORTS: CatalogSort[] = ["featured", "price_asc", "price_desc", "new"];
const AVAIL: Availability[] = ["all", "in", "out"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function intOrUndef(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

function toCents(bs: number | undefined): number | undefined {
  return bs == null ? undefined : bs * 100;
}

export interface ParsedCatalogParams {
  filters: CatalogFilters;
  sort: CatalogSort;
  page: number;
  q: string;
}

export function parseCatalogParams(sp: SearchParams): ParsedCatalogParams {
  const sortRaw = first(sp.orden) as CatalogSort | undefined;
  const availRaw = first(sp.disp) as Availability | undefined;

  return {
    q: (first(sp.q) ?? "").trim(),
    sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : "featured",
    page: Math.max(1, intOrUndef(first(sp.pag)) ?? 1),
    filters: {
      // En la URL el precio va en bolivianos; el dominio trabaja en centavos.
      minPriceBob: toCents(intOrUndef(first(sp.min))),
      maxPriceBob: toCents(intOrUndef(first(sp.max))),
      availability: availRaw && AVAIL.includes(availRaw) ? availRaw : undefined,
      discounted: first(sp.oferta) === "1" ? true : undefined,
    },
  };
}

/** Reconstruye un querystring cambiando solo algunas claves. */
export function buildCatalogQuery(
  current: SearchParams,
  patch: Record<string, string | number | undefined>,
): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    const val = first(v);
    if (val != null && val !== "") out.set(k, val);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") out.delete(k);
    else out.set(k, String(v));
  }
  out.delete("pag"); // cualquier cambio de filtro vuelve a la página 1
  const s = out.toString();
  return s ? `?${s}` : "";
}
