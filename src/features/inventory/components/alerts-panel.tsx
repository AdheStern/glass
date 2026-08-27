// Server Component: alertas de inventario (§14.4).

import { AlertTriangle, PackageX, Tags } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventoryAlerts } from "../queries";

export async function AlertsPanel() {
  const { belowMin, negative, noBarcode, counts } = await getInventoryAlerts();

  const groups = [
    {
      key: "neg",
      icon: PackageX,
      title: "Existencia negativa",
      total: counts.negative,
      rows: negative,
      hint: "Casi siempre viene de una venta sin conexión o una carga inicial mal hecha (§17).",
      tone: "text-red-600",
    },
    {
      key: "min",
      icon: AlertTriangle,
      title: "Bajo el mínimo",
      total: counts.belowMin,
      rows: belowMin,
      hint: "Exportable como lista de reposición.",
      tone: "text-amber-600",
    },
    {
      key: "code",
      icon: Tags,
      title: "Sin código de barras",
      total: counts.noBarcode,
      rows: noBarcode,
      hint: "Bandeja de etiquetas pendientes de imprimir.",
      tone: "text-muted-foreground",
    },
  ] as const;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {groups.map((g) => (
        <Card key={g.key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <g.icon className={`size-4 ${g.tone}`} />
              {g.title}
              <span className="ml-auto text-lg font-bold tabular-nums">
                {g.total}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {g.rows.length === 0 && (
              <p className="text-xs text-muted-foreground">Nada por ahora.</p>
            )}
            {g.rows.slice(0, 8).map((r) => (
              <Link
                key={r.variant_id}
                href={`/producto/${r.product_slug}`}
                className="flex justify-between gap-2 hover:underline"
              >
                <span className="truncate">{r.product_name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {r.on_hand}
                </span>
              </Link>
            ))}
            {g.total > 8 && (
              <p className="text-xs text-muted-foreground">
                y {g.total - 8} más…
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{g.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
