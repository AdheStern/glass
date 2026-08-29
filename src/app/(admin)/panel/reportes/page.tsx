import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePanel } from "@/features/auth/roles";
import { REPORTS } from "@/features/reports/registry";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage() {
  const me = await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const visible = REPORTS.filter(
    (r) => r.roles.length === 0 || r.roles.includes(me.role),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Seis que se miran una vez por semana. Todos se exportan a CSV y a PDF
          con la marca del comercio.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => (
          <Link key={r.slug} href={`/panel/reportes/${r.slug}`}>
            <Card className="h-full transition-colors hover:border-foreground/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{r.question}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
