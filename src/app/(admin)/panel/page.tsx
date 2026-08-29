import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBob } from "@/domain/money";
import type { WowDelta } from "@/domain/reports";
import { SalesSparkline } from "@/features/reports/components/sales-sparkline";
import { getDashboard } from "@/features/reports/queries";

function Delta({ d }: { d: WowDelta }) {
  if (d.pct === null) {
    return (
      <span className="text-xs text-muted-foreground">sin comparación</span>
    );
  }
  const color =
    d.direction === "up"
      ? "text-emerald-600"
      : d.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  const sign = d.pct > 0 ? "+" : "";
  return (
    <span className={`text-xs ${color}`}>
      {sign}
      {d.pct.toFixed(0)}% vs. mismo día semana pasada
    </span>
  );
}

async function Dashboard() {
  await connection();
  const { kpi, curve, topWeek, alerts } = await getDashboard();

  const tiles = [
    {
      label: "Vendido hoy",
      value: formatBob(kpi.soldTodayBob),
      delta: <Delta d={kpi.soldWow} />,
    },
    {
      label: "Ventas de hoy",
      value: kpi.salesToday.toLocaleString("es-BO"),
      delta: <Delta d={kpi.salesWow} />,
    },
    {
      label: "Pedidos sin atender",
      value: kpi.pendingOrders.toLocaleString("es-BO"),
      delta: (
        <Link href="/panel/pedidos" className="text-xs underline">
          ver bandeja
        </Link>
      ),
    },
    {
      label: "Productos bajo mínimo",
      value: kpi.belowMin.toLocaleString("es-BO"),
      delta: (
        <Link href="/panel/inventario" className="text-xs underline">
          ver inventario
        </Link>
      ),
    },
  ];

  const actionAlerts = [
    alerts.negativeStock > 0 && {
      text: `${alerts.negativeStock} variante(s) con existencia negativa`,
      href: "/panel/inventario",
    },
    alerts.quarantined > 0 && {
      text: `${alerts.quarantined} comando(s) de sincronización en cuarentena`,
      href: "/panel/sincronizacion",
    },
    alerts.staleOrders > 0 && {
      text: `${alerts.staleOrders} pedido(s) sin atender hace más de un día`,
      href: "/panel/pedidos",
    },
  ].filter(Boolean) as { text: string; href: string }[];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <span className="text-3xl font-bold tabular-nums">{t.value}</span>
              {t.delta}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Ventas · últimos 14 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalesSparkline data={curve} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 de la semana</CardTitle>
          </CardHeader>
          <CardContent>
            {topWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas aún.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {topWeek.map((p, i) => (
                  <li key={p.name} className="flex justify-between gap-2">
                    <span className="truncate">
                      {i + 1}. {p.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {p.qty} u · {formatBob(p.netBob)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {actionAlerts.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="text-base">Requiere acción</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {actionAlerts.map((a) => (
                <li key={a.href}>
                  <Link href={a.href} className="text-amber-700 underline">
                    {a.text}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PanelResumenPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Resumen</h1>
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["a", "b", "c", "d"].map((k) => (
              <Skeleton key={k} className="h-28" />
            ))}
          </div>
        }
      >
        <Dashboard />
      </Suspense>
    </div>
  );
}
