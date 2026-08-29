import "server-only";
// Glass — los 7 reportes de §18.2. Cada uno declara sus columnas y produce filas
// crudas (dinero en centavos); la tabla, el CSV y el PDF les dan formato.
import type { Role } from "@prisma/client";
import { prisma } from "@/db/client";
import { marginPercent } from "@/domain/reports";
import { getDormantReport } from "@/features/inventory/queries";
import { getProductRows, getSalesRows } from "./rollup";
import type { ReportFilters } from "./schemas";
import { rangeDates } from "./schemas";

export type CellKind = "text" | "money" | "int" | "pct" | "date";
export interface Column {
  key: string;
  label: string;
  kind: CellKind;
}
export type Row = Record<string, string | number | null>;

export interface ReportResult {
  columns: Column[];
  rows: Row[];
  totals?: Row;
  note?: string;
  subtitle: string;
}

export interface ReportDef {
  slug: string;
  title: string;
  question: string;
  /** Roles que pueden verlo; vacío = cualquier rol de panel con acceso a reportes. */
  roles: Role[];
  /** Filtros extra además del rango de fechas. */
  filters: ("operator" | "channel" | "status" | "unit")[];
  run: (f: ReportFilters) => Promise<ReportResult>;
}

const rangeLabel = (f: ReportFilters) => `Del ${f.from} al ${f.to}`;

// --------------------------------------------------------------------------

const ventas: ReportDef = {
  slug: "ventas",
  title: "Ventas por período",
  question: "¿Cuánto vendí y en qué?",
  roles: [],
  filters: ["operator", "channel"],
  run: async (f) => {
    const { from, to } = rangeDates(f);
    let rows = await getSalesRows(from, to);
    if (f.operator) rows = rows.filter((r) => r.operatorId === f.operator);
    if (f.channel) rows = rows.filter((r) => r.channel === f.channel);

    const byDay = new Map<string, Row>();
    for (const r of rows) {
      const cur = (byDay.get(r.day) ?? {
        dia: r.day,
        ventas: 0,
        bruto: 0,
        descuento: 0,
        redondeo: 0,
        neto: 0,
      }) as Row;
      cur.ventas = (cur.ventas as number) + r.salesCount;
      cur.bruto = (cur.bruto as number) + r.grossBob;
      cur.descuento = (cur.descuento as number) + r.discountBob;
      cur.redondeo = (cur.redondeo as number) + r.roundingBob;
      cur.neto = (cur.neto as number) + r.netBob;
      byDay.set(r.day, cur);
    }
    const list = [...byDay.values()].sort((a, b) =>
      String(a.dia).localeCompare(String(b.dia)),
    );
    const totals: Row = {
      dia: "Total",
      ventas: 0,
      bruto: 0,
      descuento: 0,
      redondeo: 0,
      neto: 0,
    };
    for (const r of list) {
      totals.ventas = (totals.ventas as number) + (r.ventas as number);
      totals.bruto = (totals.bruto as number) + (r.bruto as number);
      totals.descuento = (totals.descuento as number) + (r.descuento as number);
      totals.redondeo = (totals.redondeo as number) + (r.redondeo as number);
      totals.neto = (totals.neto as number) + (r.neto as number);
    }
    return {
      columns: [
        { key: "dia", label: "Día", kind: "text" },
        { key: "ventas", label: "Ventas", kind: "int" },
        { key: "bruto", label: "Bruto", kind: "money" },
        { key: "descuento", label: "Descuento", kind: "money" },
        { key: "redondeo", label: "Redondeo", kind: "money" },
        { key: "neto", label: "Neto", kind: "money" },
      ],
      rows: list,
      totals,
      subtitle: rangeLabel(f),
    };
  },
};

const masVendidos: ReportDef = {
  slug: "mas-vendidos",
  title: "Productos más vendidos",
  question: "¿Qué repongo primero?",
  roles: [],
  filters: ["unit"],
  run: async (f) => {
    const { from, to } = rangeDates(f);
    const rows = await getProductRows(from, to);
    const agg = new Map<string, { qty: number; net: number }>();
    for (const r of rows) {
      const cur = agg.get(r.variantId) ?? { qty: 0, net: 0 };
      cur.qty += r.qty;
      cur.net += r.netBob;
      agg.set(r.variantId, cur);
    }
    const ids = [...agg.keys()];
    const variants = ids.length
      ? await prisma.variant.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            attributes: true,
            product: { select: { name: true } },
          },
        })
      : [];
    const label = new Map(
      variants.map((v) => {
        const va = (v.attributes as { variante?: string } | null)?.variante;
        return [v.id, va ? `${v.product.name} — ${va}` : v.product.name];
      }),
    );
    const list = ids
      .map((id) => ({
        producto: label.get(id) ?? "—",
        unidades: agg.get(id)?.qty ?? 0,
        neto: agg.get(id)?.net ?? 0,
      }))
      .sort((a, b) =>
        f.unit === "dinero" ? b.neto - a.neto : b.unidades - a.unidades,
      )
      .slice(0, 100);
    return {
      columns: [
        { key: "producto", label: "Producto", kind: "text" },
        { key: "unidades", label: "Unidades", kind: "int" },
        { key: "neto", label: "Neto", kind: "money" },
      ],
      rows: list,
      subtitle: `${rangeLabel(f)} · orden por ${f.unit === "dinero" ? "dinero" : "unidades"}`,
    };
  },
};

const margen: ReportDef = {
  slug: "margen",
  title: "Margen por producto",
  question: "¿Qué me deja plata de verdad?",
  roles: ["PROPIETARIO"],
  filters: [],
  run: async (f) => {
    const { from, to } = rangeDates(f);
    const rows = await getProductRows(from, to);
    const agg = new Map<string, { qty: number; net: number; cogs: number }>();
    for (const r of rows) {
      const cur = agg.get(r.variantId) ?? { qty: 0, net: 0, cogs: 0 };
      cur.qty += r.qty;
      cur.net += r.netBob;
      cur.cogs += r.cogsBob;
      agg.set(r.variantId, cur);
    }
    const ids = [...agg.keys()];
    const variants = ids.length
      ? await prisma.variant.findMany({
          where: { id: { in: ids } },
          select: { id: true, product: { select: { name: true } } },
        })
      : [];
    const name = new Map(variants.map((v) => [v.id, v.product.name]));
    const list: Row[] = ids
      .map((id) => {
        const a = agg.get(id) ?? { qty: 0, net: 0, cogs: 0 };
        const pct = marginPercent(a.net, a.cogs);
        return {
          producto: name.get(id) ?? "—",
          unidades: a.qty,
          neto: a.net,
          costo: a.cogs,
          margen: a.cogs > 0 ? a.net - a.cogs : null,
          margenPct: pct,
        } as Row;
      })
      .sort(
        (a, b) => ((b.margen as number) ?? -1) - ((a.margen as number) ?? -1),
      );
    const withCost = list.filter((r) => r.margen !== null).length;
    return {
      columns: [
        { key: "producto", label: "Producto", kind: "text" },
        { key: "unidades", label: "Unidades", kind: "int" },
        { key: "neto", label: "Neto", kind: "money" },
        { key: "costo", label: "Costo", kind: "money" },
        { key: "margen", label: "Margen", kind: "money" },
        { key: "margenPct", label: "Margen %", kind: "pct" },
      ],
      rows: list,
      note:
        withCost === 0
          ? "Ningún producto vendido tiene costo cargado; el margen se muestra vacío."
          : undefined,
      subtitle: rangeLabel(f),
    };
  },
};

const arqueos: ReportDef = {
  slug: "arqueos",
  title: "Arqueos",
  question: "¿Cuadró la caja?",
  roles: [],
  filters: ["operator"],
  run: async (f) => {
    const { from, to } = rangeDates(f);
    const sessions = await prisma.cashSession.findMany({
      where: {
        closedAt: { not: null, gte: from, lte: endOfDay(to) },
        ...(f.operator ? { operatorId: f.operator } : {}),
      },
      orderBy: { closedAt: "desc" },
      include: { operator: { select: { name: true } } },
    });
    const rows: Row[] = sessions.map((s) => ({
      cierre: s.closedAt?.toISOString().slice(0, 10) ?? "",
      operador: s.operator.name,
      esperado: s.expectedBob ?? 0,
      contado: s.countedBob ?? 0,
      diferencia: s.differenceBob ?? 0,
    }));
    return {
      columns: [
        { key: "cierre", label: "Cierre", kind: "text" },
        { key: "operador", label: "Operador", kind: "text" },
        { key: "esperado", label: "Esperado", kind: "money" },
        { key: "contado", label: "Contado", kind: "money" },
        { key: "diferencia", label: "Diferencia", kind: "money" },
      ],
      rows,
      subtitle: rangeLabel(f),
    };
  },
};

const movimientos: ReportDef = {
  slug: "movimientos",
  title: "Movimientos de inventario",
  question: "¿Por qué tengo esta cantidad?",
  roles: [],
  filters: [],
  run: async (f) => {
    const { from, to } = rangeDates(f);
    const movs = await prisma.stockMovement.findMany({
      where: { occurredAt: { gte: from, lte: endOfDay(to) } },
      orderBy: { occurredAt: "desc" },
      take: 2000,
      include: {
        variant: {
          select: {
            attributes: true,
            product: { select: { name: true } },
          },
        },
      },
    });
    const rows: Row[] = movs.map((m) => {
      const va = (m.variant.attributes as { variante?: string } | null)
        ?.variante;
      return {
        fecha: m.occurredAt.toISOString().slice(0, 10),
        producto: va
          ? `${m.variant.product.name} — ${va}`
          : m.variant.product.name,
        tipo: m.kind,
        cantidad: m.qty,
        origen: m.sourceType,
        nota: m.note ?? "",
      };
    });
    return {
      columns: [
        { key: "fecha", label: "Fecha", kind: "text" },
        { key: "producto", label: "Producto", kind: "text" },
        { key: "tipo", label: "Tipo", kind: "text" },
        { key: "cantidad", label: "Cantidad", kind: "int" },
        { key: "origen", label: "Origen", kind: "text" },
        { key: "nota", label: "Nota", kind: "text" },
      ],
      rows,
      subtitle: `${rangeLabel(f)} · máx. 2000 asientos`,
    };
  },
};

const pedidos: ReportDef = {
  slug: "pedidos",
  title: "Pedidos y conversión",
  question: "¿Cuántos pedidos de WhatsApp terminan en venta?",
  roles: [],
  filters: ["status"],
  run: async (f) => {
    const { from, to } = rangeDates(f);
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: endOfDay(to) },
        ...(f.status ? { status: f.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        folio: true,
        status: true,
        totalBob: true,
        createdAt: true,
        saleId: true,
      },
    });
    const rows: Row[] = orders.map((o) => ({
      folio: o.folio,
      fecha: o.createdAt.toISOString().slice(0, 10),
      estado: o.status,
      total: o.totalBob,
      venta: o.saleId ? "Sí" : "No",
    }));
    const converted = orders.filter((o) => o.saleId).length;
    const pct = orders.length
      ? Math.round((converted / orders.length) * 100)
      : 0;
    return {
      columns: [
        { key: "folio", label: "Folio", kind: "text" },
        { key: "fecha", label: "Fecha", kind: "text" },
        { key: "estado", label: "Estado", kind: "text" },
        { key: "total", label: "Total", kind: "money" },
        { key: "venta", label: "¿Venta?", kind: "text" },
      ],
      rows,
      subtitle: `${rangeLabel(f)} · ${converted}/${orders.length} pedidos terminaron en venta (${pct}%)`,
    };
  },
};

const capitalDormido: ReportDef = {
  slug: "capital-dormido",
  title: "Capital dormido",
  question: "¿Cuánto dinero tengo parado en el estante?",
  roles: [],
  filters: [],
  run: async () => {
    const rows = (await getDormantReport()).filter(
      (r) => r.idleDays === null || r.idleDays >= 90,
    );
    return {
      columns: [
        { key: "producto", label: "Producto", kind: "text" },
        { key: "unidades", label: "Unidades", kind: "int" },
        { key: "congelado", label: "Bs congelados", kind: "money" },
        { key: "dias", label: "Días quieto", kind: "int" },
      ],
      rows: rows.map((r) => ({
        producto: r.productName,
        unidades: r.qty,
        congelado: r.frozenBob,
        dias: r.idleDays ?? 999,
      })),
      subtitle: "Sin movimiento en 90 días o más",
    };
  },
};

function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}

export const REPORTS: ReportDef[] = [
  ventas,
  masVendidos,
  margen,
  arqueos,
  movimientos,
  pedidos,
  capitalDormido,
];

export function getReport(slug: string): ReportDef | undefined {
  return REPORTS.find((r) => r.slug === slug);
}
