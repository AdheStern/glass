import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBob } from "@/domain/money";
import { requirePanel } from "@/features/auth/roles";
import { ProductRowActions } from "@/features/products/components/product-row-actions";
import { listProducts } from "@/features/products/queries";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pag?: string }>;
}) {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const sp = await searchParams;
  const page = Number(sp.pag) || 1;
  const { rows, total, totalPages } = await listProducts({ q: sp.q, page });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
        <Button asChild>
          <Link href="/panel/productos/nuevo">Nuevo producto</Link>
        </Button>
      </div>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Buscar por nombre, SKU o código"
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categorías</TableHead>
              <TableHead className="text-right">Desde</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Sin productos todavía.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    href={`/panel/productos/${r.id}`}
                    className="font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {r.variantCount}{" "}
                    {r.variantCount === 1 ? "variante" : "variantes"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.categories.join(", ") || "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.fromPriceBob != null ? formatBob(r.fromPriceBob) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.stockQty}
                </TableCell>
                <TableCell>
                  {r.isActive ? (
                    <Badge variant="secondary">Visible</Badge>
                  ) : (
                    <Badge variant="outline">Oculto</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <ProductRowActions
                    id={r.id}
                    name={r.name}
                    isActive={r.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total.toLocaleString("es-BO")} productos</span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/panel/productos?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), pag: String(page - 1) })}`}
                >
                  Anterior
                </Link>
              </Button>
            )}
            <span className="self-center">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/panel/productos?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), pag: String(page + 1) })}`}
                >
                  Siguiente
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
