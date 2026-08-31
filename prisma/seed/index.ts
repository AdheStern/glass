// Glass — generador de datos de siembra (§22.6).
// Uso: pnpm db:seed -- --products=2000 --seed=42
// Determinista: la misma semilla produce el mismo catálogo, los mismos folios y
// las mismas cifras.
import { PrismaClient } from "@prisma/client";
import { seedCatalog } from "./catalog";
import { seedChecksum } from "./checksum";
import { seedConfig } from "./config";
import { seedContent } from "./content";
import { makeUploader } from "./images";
import { seedInventoryExtras } from "./inventory";
import { makeRng, parseArgs } from "./lib";
import { seedOwner } from "./owner";
import { seedPanelUsers } from "./panel-users";
import { seedSales } from "./sales";

// La siembra escribe decenas de miles de filas: va por la conexión directa
// (DIRECT_URL), no por el pooler en modo transacción.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

// Orden inverso a las FK para poder re-sembrar sin borrar volúmenes.
async function wipe() {
  await prisma.$transaction([
    prisma.pageBlock.deleteMany(),
    prisma.page.deleteMany(),
    prisma.post.deleteMany(),
    prisma.syncCommand.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.cashMovement.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.cashSession.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.stockCountLine.deleteMany(),
    prisma.stockCount.deleteMany(),
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

  const rng = makeRng(args.seed);
  const stockStartAt = new Date(Date.UTC(2026, 0, 1));

  console.time("wipe");
  await wipe();
  console.timeEnd("wipe");

  console.time("config");
  const cfg = await seedConfig(prisma);
  console.timeEnd("config");

  console.time("owner");
  await seedOwner(prisma); // idempotente: no toca al propietario si ya existe
  await seedPanelUsers(prisma); // ADMINISTRADOR de demo con credenciales conocidas
  console.timeEnd("owner");

  console.time("catalog");
  const uploader = await makeUploader();
  const variants = await seedCatalog(
    prisma,
    rng,
    uploader,
    args.products,
    stockStartAt,
  );
  console.timeEnd("catalog");

  console.time("sales");
  const totals = await seedSales(prisma, rng, cfg, variants);
  console.timeEnd("sales");

  console.time("inventory-extras");
  const inv = await seedInventoryExtras(prisma, rng, variants);
  console.timeEnd("inventory-extras");

  console.time("content");
  const content = await seedContent(prisma);
  console.timeEnd("content");

  console.time("rebuild-derived");
  await prisma.$executeRaw`SELECT glass_rebuild_variant_stock()`;
  await prisma.$executeRaw`SELECT glass_rebuild_search()`;
  // Agregados diarios del tablero y los reportes (§18.3): todo el historial.
  await prisma.$executeRaw`SELECT glass_refresh_rollup((now() - interval '200 days')::date, now()::date)`;
  console.timeEnd("rebuild-derived");

  const checksum = await seedChecksum(prisma);
  console.log(
    `glass/seed: ${variants.length} variantes · ${totals.saleCount} ventas · ` +
      `${totals.orderCount} pedidos · ${inv.mermaCount} mermas · 1 toma aplicada · ` +
      `${content.publishedPosts} entradas + portada por bloques · ` +
      `total Bs ${(totals.grandTotalBob / 100).toLocaleString("es-BO")}`,
  );
  console.log(`glass/seed: checksum ${checksum}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
