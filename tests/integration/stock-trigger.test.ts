// Integración — el trigger de existencias mantiene variant_stock por delta (ADR-05).
// Corre contra el Postgres efímero de compose.test.yml (`make test`).
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ON_EPHEMERAL = (process.env.DATABASE_URL ?? "").includes("postgres-test");
const prisma = new PrismaClient();

describe.skipIf(!ON_EPHEMERAL)("trigger trg_stock_movement_apply", () => {
  let variantId: string;

  beforeAll(async () => {
    const product = await prisma.product.create({
      data: {
        slug: `trg-${Date.now()}`,
        name: "Producto de prueba",
        variants: { create: { basePriceBob: 1000 } },
      },
      include: { variants: true },
    });
    variantId = product.variants[0].id;
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({ where: { variantId } });
    await prisma.variantStock.deleteMany({ where: { variantId } });
    await prisma.variant.deleteMany({ where: { id: variantId } });
    await prisma.product.deleteMany({
      where: { slug: { startsWith: "trg-" } },
    });
    await prisma.$disconnect();
  });

  it("aplica el delta de cada asiento", async () => {
    await prisma.stockMovement.create({
      data: {
        variantId,
        kind: "CARGA_INICIAL",
        qty: 10,
        occurredAt: new Date(),
        sourceType: "test",
      },
    });
    await prisma.stockMovement.create({
      data: {
        variantId,
        kind: "VENTA",
        qty: -3,
        occurredAt: new Date(),
        sourceType: "test",
      },
    });

    const stock = await prisma.variantStock.findUnique({
      where: { variantId },
    });
    expect(stock?.qty).toBe(7);
  });

  it("una salida mayor a la existencia deja el resumen negativo (alerta, no error)", async () => {
    await prisma.stockMovement.create({
      data: {
        variantId,
        kind: "VENTA",
        qty: -100,
        occurredAt: new Date(),
        sourceType: "test",
      },
    });
    const stock = await prisma.variantStock.findUnique({
      where: { variantId },
    });
    expect(stock?.qty).toBe(-93);
  });

  it("glass_rebuild_variant_stock reconstruye desde el libro", async () => {
    await prisma.$executeRaw`SELECT glass_rebuild_variant_stock()`;
    const stock = await prisma.variantStock.findUnique({
      where: { variantId },
    });
    expect(stock?.qty).toBe(-93);
  });
});
