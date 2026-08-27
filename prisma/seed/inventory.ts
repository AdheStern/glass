// Glass — extras de inventario para la demo (§14): algunas mermas y una toma de
// inventario ya aplicada con sus ajustes. Determinista.
import type { PrismaClient } from "@prisma/client";
import type { SeededVariant } from "./catalog";
import { idFactory, type Rng } from "./lib";

const ANCHOR = Date.UTC(2026, 5, 20); // 20-jun-2026

export async function seedInventoryExtras(
  prisma: PrismaClient,
  rng: Rng,
  variants: SeededVariant[],
): Promise<{ mermaCount: number; countId: string }> {
  const movId = idFactory("invmov");

  // --- Mermas sueltas ---
  const mermaVariants = rng.sample(variants, 12);
  const mermas = mermaVariants.map((v) => ({
    id: movId(),
    variantId: v.id,
    kind: "MERMA" as const,
    qty: -rng.int(1, 4),
    occurredAt: new Date(ANCHOR - rng.int(0, 60) * 86_400_000),
    sourceType: "adjustment",
    note: rng.pick(["vencido", "roto en góndola", "dañado en depósito"]),
  }));
  await prisma.stockMovement.createMany({ data: mermas });

  // --- Toma de inventario aplicada ---
  const countId = idFactory("stkcnt")();
  const lineVariants = rng.sample(variants, 25);
  const frozenAt = new Date(ANCHOR - 5 * 86_400_000);

  const stockRows = await prisma.variantStock.findMany({
    where: { variantId: { in: lineVariants.map((v) => v.id) } },
    select: { variantId: true, qty: true },
  });
  const theoreticalByVariant = new Map(
    stockRows.map((r) => [r.variantId, r.qty]),
  );

  const lineId = idFactory("scl");
  const lines = lineVariants.map((v) => {
    const theoretical = theoreticalByVariant.get(v.id) ?? 0;
    // ~40 % con diferencia de ±1..3
    const counted = rng.bool(0.4)
      ? Math.max(0, theoretical + rng.pick([-3, -2, -1, 1, 2]))
      : theoretical;
    return {
      id: lineId(),
      variantId: v.id,
      theoreticalQty: theoretical,
      countedQty: counted,
      unitCostBob: Math.round(v.basePriceBob * 0.6),
    };
  });

  await prisma.stockCount.create({
    data: {
      id: countId,
      status: "APLICADA",
      scope: "LIBRE",
      note: "Toma parcial de depósito — demo",
      frozenAt,
      closedAt: new Date(frozenAt.getTime() + 3 * 3_600_000),
      appliedAt: new Date(frozenAt.getTime() + 4 * 3_600_000),
      createdAt: frozenAt,
    },
  });
  await prisma.stockCountLine.createMany({
    data: lines.map((l) => ({ ...l, stockCountId: countId })),
  });

  const adjustments = lines
    .filter((l) => l.countedQty !== l.theoreticalQty)
    .map((l) => ({
      id: movId(),
      variantId: l.variantId,
      kind: "AJUSTE" as const,
      qty: l.countedQty - l.theoreticalQty,
      occurredAt: new Date(frozenAt.getTime() + 4 * 3_600_000),
      sourceType: "stock_count",
      sourceId: countId,
      note: `Toma ${countId}`,
    }));
  if (adjustments.length) {
    await prisma.stockMovement.createMany({ data: adjustments });
  }

  return { mermaCount: mermas.length, countId };
}
