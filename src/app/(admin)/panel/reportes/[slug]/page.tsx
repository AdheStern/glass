import type { Role } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";
import { ReportFiltersForm } from "@/features/reports/components/report-filters";
import { ReportTable } from "@/features/reports/components/report-table";
import { getReport } from "@/features/reports/registry";
import { parseFilters } from "@/features/reports/schemas";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const def = getReport((await params).slug);
  return { title: def ? `Reporte · ${def.title}` : "Reporte" };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const def = getReport((await params).slug);
  if (!def) notFound();

  const allowed: Role[] = def.roles.length
    ? def.roles
    : ["PROPIETARIO", "ADMINISTRADOR"];
  await requireRole(...allowed);

  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [result, operators] = await Promise.all([
    def.run(filters),
    def.filters.includes("operator")
      ? prisma.operator.findMany({
          where: { archivedAt: null },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const query = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      typeof v === "string" ? [[k, v]] : [],
    ),
  ).toString();
  const exportHref = (fmt: string) =>
    `/panel/reportes/${def.slug}/export?format=${fmt}${query ? `&${query}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/panel/reportes"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Reportes
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{def.title}</h1>
          <p className="text-sm text-muted-foreground">{result.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={exportHref("csv")}>Descargar CSV</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={exportHref("pdf")}>Descargar PDF</a>
          </Button>
        </div>
      </div>

      <ReportFiltersForm def={def} current={filters} operators={operators} />
      <ReportTable result={result} />
    </div>
  );
}
