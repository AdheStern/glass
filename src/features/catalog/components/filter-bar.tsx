// Glass — filtros y orden (§7.3). <form method="get">: cero JS, estado en la URL.
import Link from "next/link";
import type { ParsedCatalogParams } from "@/features/catalog/params";

const SORT_LABELS: Record<string, string> = {
  featured: "Destacados",
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  new: "Novedades",
};

export function FilterBar({
  action,
  parsed,
  resultCount,
}: {
  action: string;
  parsed: ParsedCatalogParams;
  resultCount: number;
}) {
  const { filters, sort, q } = parsed;
  const field =
    "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm";

  return (
    <form method="get" action={action} className="flex flex-col gap-3">
      {q ? <input type="hidden" name="q" value={q} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="orden">
          Orden
        </label>
        <select id="orden" name="orden" defaultValue={sort} className={field}>
          {Object.entries(SORT_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="disp">
          Disponibilidad
        </label>
        <select
          id="disp"
          name="disp"
          defaultValue={filters.availability ?? "all"}
          className={field}
        >
          <option value="all">Todas</option>
          <option value="in">Disponibles</option>
          <option value="out">Agotados</option>
        </select>

        <span className="inline-flex items-center gap-1.5 text-sm text-black/70">
          <input
            type="number"
            name="min"
            inputMode="numeric"
            min={0}
            placeholder="Bs mín."
            defaultValue={
              filters.minPriceBob != null ? filters.minPriceBob / 100 : ""
            }
            className={`${field} w-24`}
          />
          <span>–</span>
          <input
            type="number"
            name="max"
            inputMode="numeric"
            min={0}
            placeholder="Bs máx."
            defaultValue={
              filters.maxPriceBob != null ? filters.maxPriceBob / 100 : ""
            }
            className={`${field} w-24`}
          />
        </span>

        <label className="inline-flex items-center gap-1.5 text-sm text-black/70">
          <input
            type="checkbox"
            name="oferta"
            value="1"
            defaultChecked={filters.discounted === true}
          />
          En oferta
        </label>

        <button
          type="submit"
          className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm font-medium text-[var(--on-brand)]"
        >
          Aplicar
        </button>
        <Link href={action} className="text-sm text-black/50 underline">
          Limpiar
        </Link>
      </div>

      <p className="text-sm text-black/50">
        {resultCount.toLocaleString("es-BO")}{" "}
        {resultCount === 1 ? "producto" : "productos"}
      </p>
    </form>
  );
}
