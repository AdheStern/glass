// Glass — siembra del catálogo: categorías, productos, variantes, imágenes,
// descuentos y la carga inicial de existencias (CARGA_INICIAL).
import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { type ImageUploader, seedImagePool } from "./images";
import { idFactory, inBatches, type Rng } from "./lib";

const PARENTS = [
  "Herramientas", "Electricidad", "Plomería", "Pinturas", "Ferretería general",
  "Jardín", "Construcción", "Seguridad",
];

export interface SeededVariant {
  id: string;
  basePriceBob: number;
}

const DIACRITICS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function seedCatalog(
  prisma: PrismaClient,
  rng: Rng,
  uploader: ImageUploader,
  productCount: number,
  stockStartAt: Date,
): Promise<SeededVariant[]> {
  // --- Categorías: 8 padres × 4 hijas = 40 -------------------------------------
  const catId = idFactory("cat");
  const parentRows = PARENTS.map((name, i) => ({
    id: catId(),
    slug: slugify(name),
    name,
    parentId: null as string | null,
    position: i,
  }));
  const childRows = parentRows.flatMap((p) =>
    Array.from({ length: 4 }, (_, ci) => {
      const name = `${faker.commerce.productAdjective()} ${p.name}`;
      return {
        id: catId(),
        slug: `${p.slug}-${ci}`,
        name,
        parentId: p.id,
        position: ci,
      };
    }),
  );
  await prisma.category.createMany({ data: [...parentRows, ...childRows] });
  const childIds = childRows.map((c) => c.id);

  // --- Productos + variantes -------------------------------------------------
  const prodId = idFactory("prod");
  const varId = idFactory("var");
  const usedSlugs = new Set<string>();
  let barcodeSeq = 7_501_000_000_000;

  const products: { id: string; slug: string; name: string; description: string; createdAt: Date }[] = [];
  const variants: { id: string; productId: string; sku: string; barcode: string; basePriceBob: number; costBob: number; minStock: number; position: number }[] = [];
  const productCategories: { productId: string; categoryId: string }[] = [];
  const initialMovements: { id: string; variantId: string; kind: "CARGA_INICIAL"; qty: number; occurredAt: Date; sourceType: string }[] = [];
  const movId = idFactory("mov");
  const seededVariants: SeededVariant[] = [];

  for (let i = 0; i < productCount; i++) {
    const id = prodId();
    const name = faker.commerce.productName();
    let slug = slugify(name);
    if (usedSlugs.has(slug)) slug = `${slug}-${i}`;
    usedSlugs.add(slug);
    products.push({
      id,
      slug,
      name,
      description: faker.commerce.productDescription(),
      createdAt: stockStartAt,
    });

    for (const categoryId of rng.sample(childIds, rng.int(1, 2))) {
      productCategories.push({ productId: id, categoryId });
    }

    const nVariants = rng.int(1, 4);
    for (let v = 0; v < nVariants; v++) {
      const vid = varId();
      const base = rng.int(10, 1600) * 50; // centavos, múltiplos de 0,50
      variants.push({
        id: vid,
        productId: id,
        sku: `SKU-${i}-${v}`,
        barcode: String(barcodeSeq++),
        basePriceBob: base,
        costBob: Math.round(base * (0.55 + rng.float() * 0.25)),
        minStock: rng.pick([0, 3, 5, 10]),
        position: v,
      });
      seededVariants.push({ id: vid, basePriceBob: base });
      initialMovements.push({
        id: movId(),
        variantId: vid,
        kind: "CARGA_INICIAL",
        qty: rng.int(20, 400),
        occurredAt: stockStartAt,
        sourceType: "seed",
      });
    }
  }

  await inBatches(products, 500, (b) => prisma.product.createMany({ data: b }));
  await inBatches(variants, 1000, (b) => prisma.variant.createMany({ data: b }));
  await inBatches(productCategories, 2000, (b) =>
    prisma.productCategory.createMany({ data: b, skipDuplicates: true }),
  );
  await inBatches(initialMovements, 1000, (b) =>
    prisma.stockMovement.createMany({ data: b }),
  );

  // --- Imágenes: pool corto subido una vez, asignado por turno --------------
  const pool = await seedImagePool(uploader);
  const imgId = idFactory("img");
  const imageRows: { id: string; productId: string; path: string; alt: string; position: number }[] = [];
  products.forEach((p, i) => {
    const n = rng.int(1, 2);
    for (let k = 0; k < n; k++) {
      imageRows.push({
        id: imgId(),
        productId: p.id,
        path: pool[(i + k) % pool.length],
        alt: p.name,
        position: k,
      });
    }
  });
  await inBatches(imageRows, 1000, (b) => prisma.productImage.createMany({ data: b }));

  // --- Descuentos ---------------------------------------------------------
  const discId = idFactory("disc");
  for (let d = 0; d < 10; d++) {
    const scope = rng.pick(["CATEGORY", "PRODUCT", "GLOBAL"] as const);
    await prisma.discount.create({
      data: {
        id: discId(),
        name: `Promo ${d + 1}`,
        scope,
        percent: rng.pick([5, 10, 15, 20]),
        isActive: rng.bool(0.6),
        categoryId: scope === "CATEGORY" ? rng.pick(childIds) : null,
        products:
          scope === "PRODUCT"
            ? { connect: rng.sample(products, 5).map((p) => ({ id: p.id })) }
            : undefined,
      },
    });
  }

  return seededVariants;
}
