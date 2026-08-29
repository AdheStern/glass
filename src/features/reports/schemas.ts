import { z } from "zod";

/** Rango por defecto: últimos 30 días hasta hoy (fecha de negocio en Bolivia). */
export function defaultRange(): { from: string; to: string } {
  const to = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
  const d = new Date(`${to}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 29);
  return { from: d.toISOString().slice(0, 10), to };
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const ReportFilterSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  operator: z.string().trim().max(40).optional(),
  channel: z.enum(["MOSTRADOR", "PEDIDO"]).optional(),
  status: z
    .enum(["NUEVO", "CONFIRMADO", "PREPARADO", "ENTREGADO", "CANCELADO"])
    .optional(),
  unit: z.enum(["unidades", "dinero"]).optional(),
});

export type ReportFilters = z.infer<typeof ReportFilterSchema>;

export function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): ReportFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }
  const parsed = ReportFilterSchema.safeParse(flat);
  const base = parsed.success ? parsed.data : {};
  const { from, to } = defaultRange();
  return { from: base.from ?? from, to: base.to ?? to, ...base };
}

export function rangeDates(f: ReportFilters): { from: Date; to: Date } {
  const { from, to } = defaultRange();
  return {
    from: new Date(`${f.from ?? from}T00:00:00Z`),
    to: new Date(`${f.to ?? to}T00:00:00Z`),
  };
}
