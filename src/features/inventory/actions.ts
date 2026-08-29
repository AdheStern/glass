"use server";
// Glass — operaciones de inventario (§14). Toda action: rol + zod + asiento en
// stock_movement (nunca escribe variant_stock) + auditoría + revalidación.
import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { internalBarcode } from "@/domain/barcode";
import { stockCountDiff } from "@/domain/inventory";
import { INVENTORY_ROLES, requireRole } from "@/features/auth/roles";
import { slugify } from "@/features/products/schemas";
import { findVariantByBarcode, type ScannedVariant } from "./queries";
import {
  CountLineSchema,
  GenerateBarcodeSchema,
  StockAdjustmentSchema,
  StockCountCreateSchema,
  StockEntrySchema,
} from "./schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/** `true` si el error de Prisma es una violación de índice único (opcionalmente en un campo dado). */
function isUniqueViolation(e: unknown, field?: string): boolean {
  const err = e as { code?: string; meta?: { target?: string[] | string } };
  if (err?.code !== "P2002") return false;
  if (!field) return true;
  const target = err.meta?.target;
  return Array.isArray(target)
    ? target.includes(field)
    : String(target ?? "").includes(field);
}

function createWithSlug(
  slug: string,
  name: string,
  barcode: string,
  priceBob: number,
) {
  return prisma.product.create({
    data: {
      slug,
      name,
      isActive: true,
      trackStock: true,
      variants: {
        create: {
          barcode: barcode || null,
          basePriceBob: priceBob,
          position: 0,
        },
      },
    },
    include: { variants: { select: { id: true } } },
  });
}

async function revalidateFor(variantIds: string[]) {
  revalidateTag("catalog", "max");
  revalidateTag("featured", "max");
  if (variantIds.length) {
    const variants = await prisma.variant.findMany({
      where: { id: { in: variantIds } },
      select: { productId: true },
    });
    for (const v of new Set(variants.map((x) => x.productId))) {
      revalidateTag(`product:${v}`, "max");
    }
  }
}

// ---------------------------------------------------------------------------
// Búsqueda por escaneo (para los formularios cliente, §15.3)
// ---------------------------------------------------------------------------

export async function lookupScanAction(
  code: string,
): Promise<{ found: true; variant: ScannedVariant } | { found: false }> {
  await requireRole(...INVENTORY_ROLES);
  const variant = await findVariantByBarcode(code);
  return variant ? { found: true, variant } : { found: false };
}

// ---------------------------------------------------------------------------
// Ingreso de compra (§14.1)
// ---------------------------------------------------------------------------

export async function registerEntryAction(raw: unknown): Promise<ActionResult> {
  const actor = await requireRole(...INVENTORY_ROLES);
  const parsed = StockEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { lines, note } = parsed.data;
  const variantIds = lines.map((l) => l.variantId);

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.stockMovement.createMany({
      data: lines.map((l) => ({
        variantId: l.variantId,
        kind: "INGRESO" as const,
        qty: l.qty,
        occurredAt: now,
        sourceType: "entry",
        note: note || null,
      })),
    });
    // Costo de reposición: si la variante no tenía costo, se registra el de la compra.
    for (const l of lines) {
      if (l.unitCostBob && l.unitCostBob > 0) {
        await tx.variant.updateMany({
          where: { id: l.variantId, costBob: null },
          data: { costBob: l.unitCostBob },
        });
      }
    }
    await tx.auditLog.create({
      data: {
        action: "stock.entry",
        entity: "stock_movement",
        entityId: variantIds[0],
        actorType: "user",
        actorId: actor.id,
        after: { lines, note: note || null } as Prisma.InputJsonValue,
      },
    });
  });

  await revalidateFor(variantIds);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Ajuste / merma (§14.1) — nota obligatoria
// ---------------------------------------------------------------------------

export async function registerAdjustmentAction(
  raw: unknown,
): Promise<ActionResult> {
  const actor = await requireRole(...INVENTORY_ROLES);
  const parsed = StockAdjustmentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { variantId, kind, qty, note } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        variantId,
        kind,
        qty,
        occurredAt: new Date(),
        sourceType: "adjustment",
        note,
      },
    });
    await tx.auditLog.create({
      data: {
        action: `stock.${kind.toLowerCase()}`,
        entity: "stock_movement",
        entityId: variantId,
        actorType: "user",
        actorId: actor.id,
        after: { kind, qty, note },
      },
    });
  });

  await revalidateFor([variantId]);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Toma de inventario (§14.3)
// ---------------------------------------------------------------------------

export async function createStockCountAction(
  raw: unknown,
): Promise<ActionResult> {
  const actor = await requireRole(...INVENTORY_ROLES);
  const parsed = StockCountCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { scope, categoryId, note } = parsed.data;
  if (scope === "CATEGORIA" && !categoryId) {
    return { ok: false, error: "Elegí una categoría" };
  }

  const variants = await prisma.variant.findMany({
    where: {
      archivedAt: null,
      product: { archivedAt: null },
      ...(scope === "CATEGORIA" && categoryId
        ? {
            product: { archivedAt: null, categories: { some: { categoryId } } },
          }
        : {}),
    },
    select: { id: true, costBob: true, stock: { select: { qty: true } } },
  });
  if (variants.length === 0) {
    return { ok: false, error: "No hay variantes en ese alcance" };
  }

  const count = await prisma.stockCount.create({
    data: {
      scope,
      categoryId: scope === "CATEGORIA" ? categoryId || null : null,
      note: note || null,
      createdByUserId: actor.id,
      lines: {
        create: variants.map((v) => ({
          variantId: v.id,
          theoreticalQty: v.stock?.qty ?? 0,
          unitCostBob: v.costBob,
        })),
      },
    },
  });
  return { ok: true, id: count.id };
}

/** Suma `+1` (o fija) el contado de una línea; la crea si el escaneo trae algo fuera del alcance. */
export async function countScanAction(
  stockCountId: string,
  variantId: string,
  mode: "increment" | "set" = "increment",
  setValue = 0,
): Promise<ActionResult> {
  await requireRole(...INVENTORY_ROLES);
  const count = await prisma.stockCount.findUnique({
    where: { id: stockCountId },
    select: { status: true },
  });
  if (!count || count.status !== "ABIERTA") {
    return { ok: false, error: "La toma no está abierta" };
  }
  const line = await prisma.stockCountLine.findUnique({
    where: { stockCountId_variantId: { stockCountId, variantId } },
    select: { id: true, countedQty: true },
  });
  if (line) {
    await prisma.stockCountLine.update({
      where: { id: line.id },
      data: {
        countedQty:
          mode === "set" ? Math.max(0, setValue) : (line.countedQty ?? 0) + 1,
      },
    });
  } else {
    await prisma.stockCountLine.create({
      data: {
        stockCountId,
        variantId,
        theoreticalQty: 0,
        countedQty: mode === "set" ? Math.max(0, setValue) : 1,
      },
    });
  }
  return { ok: true };
}

export async function saveCountLineAction(raw: unknown): Promise<ActionResult> {
  await requireRole(...INVENTORY_ROLES);
  const parsed = CountLineSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { stockCountId, variantId, countedQty } = parsed.data;
  return countScanAction(stockCountId, variantId, "set", countedQty);
}

export async function closeStockCountAction(id: string): Promise<ActionResult> {
  await requireRole(...INVENTORY_ROLES);
  const count = await prisma.stockCount.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!count) return { ok: false, error: "Toma no encontrada" };
  if (count.status !== "ABIERTA") {
    return { ok: false, error: "La toma ya está cerrada" };
  }
  await prisma.stockCount.update({
    where: { id },
    data: { status: "CERRADA", closedAt: new Date() },
  });
  return { ok: true, id };
}

export async function applyStockCountAction(id: string): Promise<ActionResult> {
  const actor = await requireRole(...INVENTORY_ROLES);
  const count = await prisma.stockCount.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!count) return { ok: false, error: "Toma no encontrada" };
  if (count.status !== "CERRADA") {
    return {
      ok: false,
      error: "Primero cerrá la toma para revisar diferencias",
    };
  }

  const adjustments = stockCountDiff(
    count.lines.map((l) => ({
      variantId: l.variantId,
      theoreticalQty: l.theoreticalQty,
      countedQty: l.countedQty,
      unitCostBob: l.unitCostBob ?? 0,
    })),
  );

  await prisma.$transaction(async (tx) => {
    if (adjustments.length) {
      const now = new Date();
      await tx.stockMovement.createMany({
        data: adjustments.map((a) => ({
          variantId: a.variantId,
          kind: "AJUSTE" as const,
          qty: a.delta,
          occurredAt: now,
          sourceType: "stock_count",
          sourceId: id,
          note: `Toma ${id}`,
        })),
      });
    }
    await tx.stockCount.update({
      where: { id },
      data: { status: "APLICADA", appliedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        action: "stock.count.apply",
        entity: "stock_count",
        entityId: id,
        actorType: "user",
        actorId: actor.id,
        after: { adjustments: adjustments.length } as Prisma.InputJsonValue,
      },
    });
  });

  await revalidateFor(adjustments.map((a) => a.variantId));
  return { ok: true, id };
}

export async function cancelStockCountAction(
  id: string,
): Promise<ActionResult> {
  await requireRole(...INVENTORY_ROLES);
  const count = await prisma.stockCount.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!count) return { ok: false, error: "Toma no encontrada" };
  if (count.status === "APLICADA") {
    return { ok: false, error: "Una toma aplicada es inmutable" };
  }
  await prisma.stockCount.update({
    where: { id },
    data: { status: "CANCELADA" },
  });
  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// Alta rápida por escaneo (§15.3, §19.1) + código interno (§15.2)
// ---------------------------------------------------------------------------

export interface QuickCreateResult extends ActionResult {
  variant?: {
    id: string;
    productName: string;
    slug: string;
    basePriceBob: number;
  };
}

export async function quickCreateFromScanAction(input: {
  barcode: string;
  name: string;
  priceBs: string | number;
}): Promise<QuickCreateResult> {
  const actor = await requireRole(...INVENTORY_ROLES);
  const barcode = input.barcode.trim();
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Poné un nombre" };
  const priceBob =
    typeof input.priceBs === "number"
      ? Math.round(input.priceBs * 100)
      : Math.round(
          Number.parseFloat(String(input.priceBs).replace(",", ".")) * 100,
        );
  if (!Number.isFinite(priceBob) || priceBob < 0) {
    return { ok: false, error: "Precio inválido" };
  }

  if (barcode) {
    const dupe = await prisma.variant.findFirst({
      where: { barcode },
      select: { id: true },
    });
    if (dupe) return { ok: false, error: "Ese código ya existe" };
  }

  // Se intenta crear con el slug base; si choca (slug único), se reintenta con
  // sufijo. Evita un ida y vuelta de pre-chequeo en el caso normal (escaneo).
  const base = slugify(name) || "producto";
  let product: Awaited<ReturnType<typeof createWithSlug>> | null = null;
  let slug = base;
  for (let attempt = 0; attempt < 20 && !product; attempt++) {
    slug = attempt === 0 ? base : `${base}-${attempt}`;
    try {
      product = await createWithSlug(slug, name, barcode, priceBob);
    } catch (e) {
      if (isUniqueViolation(e, "slug")) continue;
      console.error("glass/quickCreateFromScan:", e);
      return { ok: false, error: "No se pudo crear el producto" };
    }
  }
  if (!product) return { ok: false, error: "No se pudo crear el producto" };

  const variantId = product.variants[0].id;
  await prisma.auditLog.create({
    data: {
      action: "product.quick_create",
      entity: "product",
      entityId: product.id,
      actorType: "user",
      actorId: actor.id,
      after: { name, slug, barcode: barcode || null },
    },
  });

  revalidateTag("catalog", "max");
  return {
    ok: true,
    variant: { id: variantId, productName: name, slug, basePriceBob: priceBob },
  };
}

export async function generateInternalBarcodesAction(
  raw: unknown,
): Promise<ActionResult & { assigned?: number }> {
  const actor = await requireRole(...INVENTORY_ROLES);
  const parsed = GenerateBarcodeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  let assigned = 0;
  for (const variantId of parsed.data.variantIds) {
    const v = await prisma.variant.findUnique({
      where: { id: variantId },
      select: { barcode: true },
    });
    if (!v || (v.barcode && v.barcode.length > 0)) continue;

    let code = internalBarcode(`${variantId}-${Date.now()}`);
    for (
      let n = 0;
      await prisma.variant.findFirst({
        where: { barcode: code },
        select: { id: true },
      });
      n++
    ) {
      code = internalBarcode(`${variantId}-${Date.now()}-${n}`);
    }
    await prisma.variant.update({
      where: { id: variantId },
      data: { barcode: code },
    });
    assigned++;
  }

  if (assigned) {
    await prisma.auditLog.create({
      data: {
        action: "variant.internal_barcode",
        entity: "variant",
        entityId: parsed.data.variantIds[0],
        actorType: "user",
        actorId: actor.id,
        after: { assigned },
      },
    });
    revalidateTag("catalog", "max");
  }
  return { ok: true, assigned };
}
