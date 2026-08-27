// Glass — paginación por enlaces (§24.2 regla 2: toda lista pública tiene tope).
import Link from "next/link";
import type { SearchParams } from "@/features/catalog/params";

function hrefFor(base: string, current: SearchParams, page: number): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val != null && val !== "" && k !== "pag") out.set(k, val);
  }
  if (page > 1) out.set("pag", String(page));
  const s = out.toString();
  return s ? `${base}?${s}` : base;
}

export function Pagination({
  base,
  current,
  page,
  totalPages,
}: {
  base: string;
  current: SearchParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const nums: number[] = [];
  const push = (n: number) =>
    n >= 1 && n <= totalPages && !nums.includes(n) && nums.push(n);
  push(1);
  for (let d = -1; d <= 1; d++) push(page + d);
  push(totalPages);
  nums.sort((a, b) => a - b);

  const cell = "min-w-9 rounded-lg border px-2.5 py-1.5 text-center text-sm";

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-center gap-1.5 py-4"
    >
      {page > 1 && (
        <Link
          href={hrefFor(base, current, page - 1)}
          className={`${cell} border-black/15`}
          rel="prev"
        >
          Anterior
        </Link>
      )}
      {nums.map((n, i) => {
        const gap = i > 0 && n - nums[i - 1] > 1;
        return (
          <span key={n} className="flex items-center gap-1.5">
            {gap && <span className="px-1 text-black/30">…</span>}
            {n === page ? (
              <span
                className={`${cell} border-[var(--brand)] bg-[var(--brand)] font-medium text-[var(--on-brand)]`}
                aria-current="page"
              >
                {n}
              </span>
            ) : (
              <Link
                href={hrefFor(base, current, n)}
                className={`${cell} border-black/15`}
              >
                {n}
              </Link>
            )}
          </span>
        );
      })}
      {page < totalPages && (
        <Link
          href={hrefFor(base, current, page + 1)}
          className={`${cell} border-black/15`}
          rel="next"
        >
          Siguiente
        </Link>
      )}
    </nav>
  );
}
