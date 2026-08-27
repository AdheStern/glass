// Glass — utilidades de siembra determinista (§22.6).
import seedrandom from "seedrandom";

export interface SeedArgs {
  products: number;
  seed: number;
}

export function parseArgs(argv: string[]): SeedArgs {
  const get = (name: string) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split("=")[1] : undefined;
  };
  return {
    products: Number(get("products") ?? 2000),
    seed: Number(get("seed") ?? 42),
  };
}

/** PRNG con semilla fija: la misma semilla produce el mismo catálogo. */
export function makeRng(seed: number) {
  const rng = seedrandom(String(seed));
  return {
    float: () => rng(),
    int: (min: number, max: number) =>
      min + Math.floor(rng() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)],
    bool: (p = 0.5) => rng() < p,
    /** Muestra `k` elementos distintos de `arr`. */
    sample: <T>(arr: readonly T[], k: number): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, Math.min(k, copy.length));
    },
  };
}

export type Rng = ReturnType<typeof makeRng>;

/** Id determinista basado en contador. No es cuid, pero es estable y único. */
export function idFactory(prefix: string) {
  let n = 0;
  return () => `${prefix}_${(n++).toString(36).padStart(10, "0")}`;
}

export const folio = (prefix: string, n: number) =>
  `${prefix}-${String(n).padStart(6, "0")}`;

/** Inserta en lotes para no reventar el pooler de Supabase. */
export async function inBatches<T>(
  items: T[],
  size: number,
  fn: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}
