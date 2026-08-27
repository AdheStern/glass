// Glass — generador de datos de siembra (§22.6).
// Uso: pnpm db:seed -- --products=2000 --seed=42
// Determinista: la misma semilla produce el mismo catálogo, los mismos folios y
// las mismas cifras.
import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import { seedCatalog } from "./catalog";
import { seedChecksum } from "./checksum";
import { seedConfig } from "./config";
import { makeUploader } from "./images";
import { makeRng, parseArgs } from "./lib";
import { seedSales } from "./sales";

// La siembra escribe decenas de miles de filas: va por la conexión directa
// (DIRECT_URL), no por el pooler en modo transacción.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

// Orden inverso a las FK para poder re-sembrar sin borrar volúmenes.
async function wipe() {
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.cashMovement.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.cashSession.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.variantStock.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productCategory.deleteMany(),
    prisma.$executeRaw`DELETE FROM "_DiscountToProduct"`,
    prisma.discount.deleteMany(),
    prisma.variant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
  ]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`glass/seed: productos=${args.products} semilla=${args.seed}`);

  faker.seed(args.seed);
  const rng = makeRng(args.seed);
  const stockStartAt = new Date(Date.UTC(2026, 0, 1));

  console.time("wipe");
  await wipe();
  console.timeEnd("wipe");

  console.time("config");
  const cfg = await seedConfig(prisma);
  console.timeEnd("config");

  console.time("catalog");
  const uploader = await makeUploader();
  const variants = await seedCatalog(prisma, rng, uploader, args.products, stockStartAt);
  console.timeEnd("catalog");

  console.time("sales");
  const totals = await seedSales(prisma, rng, cfg, variants);
  console.timeEnd("sales");

  console.time("rebuild-stock");
  await prisma.$executeRaw`SELECT glass_rebuild_variant_stock()`;
  console.timeEnd("rebuild-stock");

  const checksum = await seedChecksum(prisma);
  console.log(
    `glass/seed: ${variants.length} variantes · ${totals.saleCount} ventas · ` +
      `${totals.orderCount} pedidos · total Bs ${(totals.grandTotalBob / 100).toLocaleString("es-BO")}`,
  );
  console.log(`glass/seed: checksum ${checksum}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
