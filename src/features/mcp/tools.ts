import "server-only";
// Glass — herramientas MCP de **solo lectura** sobre los datos del comercio. Se
// exponen por `/api/mcp`, autenticadas por Better Auth; cada una respeta el rol
// del usuario del token. Los esquemas van como JSON Schema (el SDK v2 pide
// zod v4; el proyecto usa zod v3).
import { fromJsonSchema, McpServer } from "@modelcontextprotocol/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/db/client";
import { parseRole } from "@/features/auth/roles";

export interface McpCaller {
  userId: string;
  role: Role;
}

/** Resuelve el usuario del token (claim `sub`) y su rol efectivo. */
export async function resolveCaller(claims: {
  sub?: unknown;
}): Promise<McpCaller | null> {
  if (typeof claims.sub !== "string") return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { role: true, archivedAt: true, email: true },
  });
  if (!user || user.archivedAt) return null;
  const owner = (process.env.OWNER_EMAIL ?? "").toLowerCase();
  const role =
    owner && user.email.toLowerCase() === owner
      ? "PROPIETARIO"
      : parseRole(user.role);
  return { userId: claims.sub, role };
}

function text(body: string) {
  return { content: [{ type: "text" as const, text: body }] };
}

const bs = (cents: number) => `Bs ${(cents / 100).toFixed(2)}`;

const num = (v: unknown, fallback: number, max: number) => {
  const n = typeof v === "number" ? Math.floor(v) : Number.NaN;
  return Number.isFinite(n) && n >= 1 && n <= max ? n : fallback;
};

export function buildGlassMcpServer(caller: McpCaller): McpServer {
  const server = new McpServer({ name: "glass", version: "1.0.0" });

  server.registerTool(
    "resumen_ventas",
    {
      title: "Resumen de ventas",
      description:
        "Total vendido, número de ventas y ticket promedio del día o de la semana.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: {
          periodo: { type: "string", enum: ["hoy", "semana"] },
        },
      }),
    },
    async (args) => {
      const periodo =
        (args as { periodo?: string })?.periodo === "semana" ? "semana" : "hoy";
      const since = new Date();
      if (periodo === "semana") since.setDate(since.getDate() - 7);
      else since.setHours(0, 0, 0, 0);
      const sales = await prisma.sale.findMany({
        where: { voidedAt: null, occurredAtDevice: { gte: since } },
        select: { totalBob: true },
      });
      const total = sales.reduce((s, x) => s + x.totalBob, 0);
      const avg = sales.length ? Math.round(total / sales.length) : 0;
      return text(
        `${periodo === "hoy" ? "Hoy" : "Últimos 7 días"}: ${sales.length} ventas · ${bs(total)} · ticket promedio ${bs(avg)}`,
      );
    },
  );

  server.registerTool(
    "stock_bajo",
    {
      title: "Stock bajo",
      description:
        "Productos en o por debajo del mínimo, o con saldo negativo.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: { limite: { type: "number" } },
      }),
    },
    async (args) => {
      const limite = num((args as { limite?: unknown })?.limite, 20, 100);
      const rows = await prisma.$queryRaw<
        { product_name: string; sku: string | null; on_hand: number }[]
      >`select product_name, sku, on_hand from variant_stock_alert
        where below_min or negative order by on_hand asc limit ${limite}`;
      if (rows.length === 0) return text("Nada bajo el mínimo.");
      return text(
        rows
          .map(
            (r) =>
              `• ${r.product_name}${r.sku ? ` (${r.sku})` : ""}: ${r.on_hand}`,
          )
          .join("\n"),
      );
    },
  );

  server.registerTool(
    "pedidos_pendientes",
    {
      title: "Pedidos pendientes",
      description:
        "Pedidos de WhatsApp sin entregar (nuevos, confirmados o preparados).",
      inputSchema: fromJsonSchema({ type: "object", properties: {} }),
    },
    async () => {
      const orders = await prisma.order.findMany({
        where: { status: { in: ["NUEVO", "CONFIRMADO", "PREPARADO"] } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { folio: true, status: true, totalBob: true },
      });
      if (orders.length === 0) return text("No hay pedidos pendientes.");
      return text(
        orders
          .map((o) => `• ${o.folio} · ${o.status} · ${bs(o.totalBob)}`)
          .join("\n"),
      );
    },
  );

  server.registerTool(
    "buscar_productos",
    {
      title: "Buscar productos",
      description:
        "Busca productos activos por nombre y devuelve precio y código.",
      inputSchema: fromJsonSchema({
        type: "object",
        properties: { q: { type: "string" } },
        required: ["q"],
      }),
    },
    async (args) => {
      const q = String((args as { q?: unknown })?.q ?? "")
        .trim()
        .slice(0, 80);
      if (!q) return text("Falta el término de búsqueda.");
      const variants = await prisma.variant.findMany({
        where: {
          archivedAt: null,
          product: {
            isActive: true,
            archivedAt: null,
            name: { contains: q, mode: "insensitive" },
          },
        },
        take: 20,
        select: {
          barcode: true,
          basePriceBob: true,
          product: { select: { name: true } },
        },
      });
      if (variants.length === 0) return text(`Sin resultados para "${q}".`);
      return text(
        variants
          .map(
            (v) =>
              `• ${v.product.name} — ${bs(v.basePriceBob)}${v.barcode ? ` · ${v.barcode}` : ""}`,
          )
          .join("\n"),
      );
    },
  );

  if (caller.role === "PROPIETARIO" || caller.role === "ADMINISTRADOR") {
    server.registerTool(
      "arqueos_recientes",
      {
        title: "Arqueos recientes",
        description:
          "Últimos cierres de caja con su diferencia (solo dueño/administrador).",
        inputSchema: fromJsonSchema({
          type: "object",
          properties: { limite: { type: "number" } },
        }),
      },
      async (args) => {
        const limite = num((args as { limite?: unknown })?.limite, 10, 50);
        const rows = await prisma.cashSession.findMany({
          where: { closedAt: { not: null } },
          orderBy: { closedAt: "desc" },
          take: limite,
          select: {
            closedAt: true,
            expectedBob: true,
            differenceBob: true,
            operator: { select: { name: true } },
          },
        });
        if (rows.length === 0) return text("Sin arqueos cerrados.");
        return text(
          rows
            .map(
              (r) =>
                `• ${r.closedAt?.toLocaleDateString("es-BO")} · ${r.operator.name} · esperado ${bs(r.expectedBob ?? 0)} · diferencia ${bs(r.differenceBob ?? 0)}`,
            )
            .join("\n"),
        );
      },
    );
  }

  return server;
}
