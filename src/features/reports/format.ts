// Glass — formato de celdas de reporte, compartido por tabla / CSV / PDF.
import { formatBob } from "@/domain/money";
import type { CellKind } from "./registry";

/** Para mostrar en pantalla y en el PDF. */
export function displayCell(kind: CellKind, v: string | number | null): string {
  if (v == null) return "—";
  switch (kind) {
    case "money":
      return formatBob(Number(v));
    case "int":
      return Number(v).toLocaleString("es-BO");
    case "pct":
      return `${Number(v).toFixed(1)}%`;
    default:
      return String(v);
  }
}

/** Para el CSV: dinero en Bs con punto decimal, sin separador de miles. */
export function csvValue(
  kind: CellKind,
  v: string | number | null,
): string | number {
  if (v == null) return "";
  if (kind === "money") return (Number(v) / 100).toFixed(2);
  if (kind === "pct") return Number(v).toFixed(1);
  return v;
}
