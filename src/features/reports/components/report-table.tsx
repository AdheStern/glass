// Glass — tabla de un reporte (§18.2). Server Component, sin JS.
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { displayCell } from "../format";
import type { ReportResult } from "../registry";

export function ReportTable({ result }: { result: ReportResult }) {
  const { columns, rows, totals, note } = result;
  const alignRight = (k: string) =>
    ["money", "int", "pct"].includes(k) ? "text-right tabular-nums" : "";

  return (
    <div className="flex flex-col gap-3">
      {note && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {note}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={alignRight(c.kind)}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sin datos para este período.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: filas de reporte sin id estable
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={alignRight(c.kind)}>
                      {displayCell(c.kind, r[c.key] ?? null)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {totals && (
            <tfoot>
              <TableRow className="font-medium">
                {columns.map((c) => (
                  <TableCell key={c.key} className={alignRight(c.kind)}>
                    {totals[c.key] == null
                      ? ""
                      : displayCell(c.kind, totals[c.key] ?? null)}
                  </TableCell>
                ))}
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}
