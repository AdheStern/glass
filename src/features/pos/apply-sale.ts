import "server-only";
// Glass — núcleo idempotente de una venta del POS (§16.1, §13.1, §17.2). Lo usan
// la action en línea (`createSaleAction`) y el lote de sincronización sin
// conexión (`/api/sync/batch`). La venta cobrada nunca se rechaza por stock.
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { changeDue } from "@/domain/arqueo";
import {
  type BuildSaleResult,
  buildSale,
  type RoundingMode,
} from "@/domain/sale";
import { getVariantPricing } from "@/features/orders/pricing";
import { nextDeviceSeq, nextSaleFolioNumber } from "./folio";
import { requireAuthPin } from "./pin";

const ROUNDING: Record<string, RoundingMode> = {
  NONE: "NONE",
  NEAREST_10: "NEAREST_10",
  NEAREST_50: "NEAREST_50",
};
const SUPER_ROLES = ["PROPIETARIO", "ADMINISTRADOR"] as const;

export interface SaleCommandInput {
  clientSaleId: string;
  occurredAtDevice: Date;
  sessionId: string;
  lines: { variantId: string; qty: number; discountPercent?: number }[];
  globalDiscountPercent?: number;
  payments: { methodId: string; amountBob: number }[];
  tenderedBob?: number;
  orderId?: string;
  /** En línea: el servidor valida el PIN. */
  authPin?: string;
  /** Sin conexión: el dispositivo ya validó el PIN contra el hash del paquete. */
  authorizedByOperatorId?: string | null;
}

export type AppliedSale =
  | {
      ok: true;
      duplicate: boolean;
      saleId: string;
      folio: string;
      seq: number;
      totalBob: number;
      changeBob: number;
      negativeVariantIds: string[];
    }
  | { ok: false; error: string };

interface ResolvedSale {
  built: BuildSaleResult;
  itemData: {
    variantId: string;
    qty: number;
    unitPriceBob: number;
    discountBob: number;
  }[];
  authorizedBy: string | null;
  operatorId: string;
  variantIds: string[];
}

function found(row: {
  id: string;
  folio: string;
  seq: number;
  totalBob: number;
}): Extract<AppliedSale, { ok: true }> & { duplicate: true } {
  return {
    ok: true,
    duplicate: true,
    saleId: row.id,
    folio: row.folio,
    seq: row.seq,
    totalBob: row.totalBob,
    changeBob: changeDue(row.totalBob, row.totalBob),
    negativeVariantIds: [],
  };
}

async function existingSale(clientSaleId: string) {
  return prisma.sale.findUnique({
    where: { clientSaleId },
    select: { id: true, folio: true, seq: true, totalBob: true },
  });
}

async function negativeAfter(variantIds: string[]): Promise<string[]> {
  const rows = await prisma.variantStock.findMany({
    where: { variantId: { in: variantIds }, qty: { lt: 0 } },
    select: { variantId: true },
  });
  return rows.map((r) => r.variantId);
}

async function resolveSale(
  device: { id: string },
  input: SaleCommandInput,
  opts: { operatorId?: string },
): Promise<{ ok: false; error: string } | { ok: true; data: ResolvedSale }> {
  const session = await prisma.cashSession.findUnique({
    where: { id: input.sessionId },
  });
  if (!session || session.closedAt || session.deviceId !== device.id) {
    return { ok: false, error: "El turno no está abierto en este dispositivo" };
  }

  const settings = await getSiteSettings();
  const pricing = await getVariantPricing(input.lines.map((l) => l.variantId));

  const cap = settings.maxCashierDiscountPercent;
  const needsAuth =
    (input.globalDiscountPercent ?? 0) > cap ||
    input.lines.some((l) => (l.discountPercent ?? 0) > cap);
  let authorizedBy: string | null = input.authorizedByOperatorId ?? null;
  if (needsAuth && !authorizedBy) {
    if (!input.authPin) {
      return {
        ok: false,
        error: "Ese descuento necesita PIN de un rol superior",
      };
    }
    authorizedBy = (await requireAuthPin(input.authPin, [...SUPER_ROLES])).id;
  }

  const built = buildSale({
    lines: input.lines.map((l) => {
      const p = pricing.get(l.variantId);
      if (!p) throw new Error(`Variante ${l.variantId} no disponible`);
      return {
        variantId: l.variantId,
        qty: l.qty,
        baseUnitPriceBob: p.effectiveBob,
        discount: l.discountPercent
          ? { percent: l.discountPercent }
          : undefined,
      };
    }),
    globalDiscountPercent: input.globalDiscountPercent,
    roundingMode: ROUNDING[settings.roundingMode] ?? "NONE",
  });

  if (input.payments.reduce((s, p) => s + p.amountBob, 0) !== built.totalBob) {
    return { ok: false, error: "Los pagos no suman el total" };
  }

  const itemData = built.lines.map((l) => {
    const p = pricing.get(l.variantId);
    const listUnit = p?.basePriceBob ?? l.unitPriceBob;
    return {
      variantId: l.variantId,
      qty: l.qty,
      unitPriceBob: l.unitPriceBob,
      discountBob: (listUnit - l.unitPriceBob) * l.qty,
    };
  });

  return {
    ok: true,
    data: {
      built,
      itemData,
      authorizedBy,
      operatorId: opts.operatorId ?? session.operatorId,
      variantIds: built.lines.map((l) => l.variantId),
    },
  };
}

async function commitSale(
  device: { id: string },
  input: SaleCommandInput,
  r: ResolvedSale,
  fixedSeq: number | undefined,
): Promise<{ id: string; folio: string; seq: number; totalBob: number }> {
  const now = new Date();
  const [baseFolioN, baseSeq] = await Promise.all([
    nextSaleFolioNumber(prisma),
    fixedSeq != null
      ? Promise.resolve(fixedSeq)
      : nextDeviceSeq(prisma, device.id),
  ]);

  for (let attempt = 0; attempt < 8; attempt++) {
    const folio = `V-${String(baseFolioN + attempt).padStart(6, "0")}`;
    const seq = fixedSeq ?? baseSeq + attempt;
    try {
      return await prisma.$transaction(
        (tx) =>
          writeSale(tx, {
            device,
            input,
            r,
            folio,
            seq,
            now,
          }),
        { timeout: 15000 },
      );
    } catch (e) {
      const target =
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        Array.isArray(e.meta?.target)
          ? (e.meta.target as string[])
          : [];
      if (target.includes("folio") && attempt < (fixedSeq != null ? 6 : 3)) {
        continue;
      }
      const again = await existingSale(input.clientSaleId);
      if (again) return again;
      throw e;
    }
  }
  throw new Error("glass/pos: no se pudo asignar folio a la venta");
}

async function writeSale(
  tx: Prisma.TransactionClient,
  c: {
    device: { id: string };
    input: SaleCommandInput;
    r: ResolvedSale;
    folio: string;
    seq: number;
    now: Date;
  },
) {
  const { input, r } = c;
  const created = await tx.sale.create({
    data: {
      folio: c.folio,
      clientSaleId: input.clientSaleId,
      deviceId: c.device.id,
      seq: c.seq,
      operatorId: r.operatorId,
      cashSessionId: input.sessionId,
      authorizedByOperatorId: r.authorizedBy,
      subtotalBob: r.built.subtotalBob,
      discountBob: r.built.discountBob,
      roundingBob: r.built.roundingBob,
      totalBob: r.built.totalBob,
      occurredAtDevice: input.occurredAtDevice,
      priceSnapshotAt: c.now,
      items: { create: r.itemData },
      payments: {
        create: input.payments.map((p) => ({
          methodId: p.methodId,
          amountBob: p.amountBob,
        })),
      },
    },
  });
  await tx.stockMovement.createMany({
    data: r.built.lines.map((l) => ({
      variantId: l.variantId,
      kind: "VENTA" as const,
      qty: -l.qty,
      occurredAt: input.occurredAtDevice,
      sourceType: "sale",
      sourceId: created.id,
      operatorId: r.operatorId,
    })),
  });
  if (input.orderId) {
    await tx.order.update({
      where: { id: input.orderId },
      data: { saleId: created.id, status: "ENTREGADO", statusChangedAt: c.now },
    });
  }
  return {
    id: created.id,
    folio: created.folio,
    seq: created.seq,
    totalBob: created.totalBob,
  };
}

/**
 * Registra una venta de forma idempotente sobre `clientSaleId`. Si `opts.seq`
 * viene dado (lote sin conexión), lo usa como `Sale.seq`; si no, lo calcula.
 */
export async function applySaleCommand(
  device: { id: string },
  input: SaleCommandInput,
  opts: { seq?: number; operatorId?: string } = {},
): Promise<AppliedSale> {
  const dup = await existingSale(input.clientSaleId);
  if (dup) {
    return {
      ...found(dup),
      changeBob: changeDue(dup.totalBob, input.tenderedBob ?? dup.totalBob),
    };
  }

  const resolved = await resolveSale(device, input, opts);
  if (!resolved.ok) return resolved;

  const sale = await commitSale(device, input, resolved.data, opts.seq);
  return {
    ok: true,
    duplicate: false,
    saleId: sale.id,
    folio: sale.folio,
    seq: sale.seq,
    totalBob: sale.totalBob,
    changeBob: changeDue(sale.totalBob, input.tenderedBob ?? sale.totalBob),
    negativeVariantIds: await negativeAfter(resolved.data.variantIds),
  };
}
