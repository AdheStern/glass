// Glass — descarga de un reporte en CSV o PDF con la marca del comercio (§18.2).
import type { Role } from "@prisma/client";
import { getSiteSettings } from "@/db/settings";
import { AuthError, requireRole } from "@/features/auth/roles";
import { toCsv } from "@/features/reports/csv";
import { csvValue, displayCell } from "@/features/reports/format";
import { buildReportPdf } from "@/features/reports/pdf";
import { getReport } from "@/features/reports/registry";
import { parseFilters } from "@/features/reports/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const def = getReport((await params).slug);
  if (!def) return new Response("No existe", { status: 404 });

  const allowed: Role[] = def.roles.length
    ? def.roles
    : ["PROPIETARIO", "ADMINISTRADOR"];
  try {
    await requireRole(...allowed);
  } catch (e) {
    if (e instanceof AuthError)
      return new Response("No autorizado", { status: 401 });
    throw e;
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const sp = Object.fromEntries(url.searchParams.entries());
  const filters = parseFilters(sp);
  const result = await def.run(filters);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const headers = result.columns.map((c) => c.label);
    const rows = result.rows.map((r) =>
      result.columns.map((c) => csvValue(c.kind, r[c.key] ?? null)),
    );
    if (result.totals) {
      rows.push(
        result.columns.map((c) =>
          result.totals?.[c.key] == null
            ? ""
            : csvValue(c.kind, result.totals[c.key] ?? null),
        ),
      );
    }
    return new Response(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${def.slug}-${stamp}.csv"`,
      },
    });
  }

  const settings = await getSiteSettings();
  const pdf = await buildReportPdf({
    siteName: settings.name,
    title: def.title,
    subtitle: result.subtitle,
    columns: result.columns.map((c) => ({
      label: c.label,
      align: ["money", "int", "pct"].includes(c.kind) ? "right" : "left",
    })),
    rows: result.rows.map((r) =>
      result.columns.map((c) => displayCell(c.kind, r[c.key] ?? null)),
    ),
    totals: result.totals
      ? result.columns.map((c) =>
          result.totals?.[c.key] == null
            ? ""
            : displayCell(c.kind, result.totals[c.key] ?? null),
        )
      : undefined,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${def.slug}-${stamp}.pdf"`,
    },
  });
}
