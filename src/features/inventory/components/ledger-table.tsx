// Server Component: el libro de movimientos (§14.1). Filtros por searchParams.
import Link from "next/link";
import { getMovementLedger, type LedgerFilter } from "../queries";

const KIND_LABEL: Record<string, string> = {
  INGRESO: "Ingreso",
  VENTA: "Venta",
  PEDIDO_ENTREGADO: "Pedido entregado",
  DEVOLUCION: "Devolución",
  MERMA: "Merma",
  AJUSTE: "Ajuste",
  CARGA_INICIAL: "Carga inicial",
};

const KINDS = Object.keys(KIND_LABEL);

function qs(base: LedgerFilter, patch: Partial<LedgerFilter>): string {
  const merged = { ...base, ...patch };
  const p = new URLSearchParams();
  if (merged.kind) p.set("kind", merged.kind);
  if (merged.variantId) p.set("variantId", merged.variantId);
  if (merged.page && merged.page > 1) p.set("page", String(merged.page));
  const s = p.toString();
  return s ? `/panel/inventario?${s}` : "/panel/inventario";
}

export async function LedgerTable({ filter }: { filter: LedgerFilter }) {
  const { rows, page, hasMore } = await getMovementLedger(filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1 text-xs">
        <Link
          href={qs(filter, { kind: undefined, page: 1 })}
          className={`rounded-full border px-2 py-1 ${!filter.kind ? "bg-foreground text-background" : ""}`}
        >
          Todos
        </Link>
        {KINDS.map((k) => (
          <Link
            key={k}
            href={qs(filter, { kind: k, page: 1 })}
            className={`rounded-full border px-2 py-1 ${filter.kind === k ? "bg-foreground text-background" : ""}`}
          >
            {KIND_LABEL[k]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Fecha</th>
              <th className="p-2">Producto</th>
              <th className="p-2">Tipo</th>
              <th className="p-2 text-right">Cantidad</th>
              <th className="p-2">Origen</th>
              <th className="p-2">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-4 text-center text-muted-foreground"
                >
                  Sin movimientos.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">
                  {r.occurredAt.toLocaleString("es-BO")}
                </td>
                <td className="p-2">
                  <Link
                    href={`/producto/${r.productSlug}`}
                    className="hover:underline"
                  >
                    {r.variantLabel}
                  </Link>
                </td>
                <td className="p-2">{KIND_LABEL[r.kind] ?? r.kind}</td>
                <td
                  className={`p-2 text-right font-medium tabular-nums ${
                    r.qty < 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {r.qty > 0 ? `+${r.qty}` : r.qty}
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {r.sourceType}
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {r.note ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(page > 1 || hasMore) && (
        <div className="flex justify-between text-sm">
          {page > 1 ? (
            <Link href={qs(filter, { page: page - 1 })} className="underline">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={qs(filter, { page: page + 1 })} className="underline">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
