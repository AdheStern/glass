// Glass — siembra del catálogo: categorías, productos, variantes, imágenes,
// descuentos y la carga inicial de existencias (CARGA_INICIAL).
import type { PrismaClient } from "@prisma/client";
import { gradientDataUri, type ImageUploader, seedImagePool } from "./images";
import { idFactory, inBatches, type Rng } from "./lib";
import { HERO_PRODUCTS, productDescription, productName } from "./names";

const PARENTS = [
  "Herramientas",
  "Electricidad",
  "Plomería",
  "Pinturas",
  "Ferretería general",
  "Jardín",
  "Construcción",
  "Seguridad",
];

const SUBCATS: Record<string, string[]> = {
  Herramientas: ["Eléctricas", "Manuales", "Medición", "Accesorios"],
  Electricidad: ["Iluminación", "Cables", "Tableros", "Tomas e interruptores"],
  Plomería: ["Tuberías", "Grifería", "Accesorios", "Riego"],
  Pinturas: ["Interiores", "Exteriores", "Accesorios", "Preparación"],
  "Ferretería general": [
    "Fijaciones",
    "Adhesivos",
    "Candados y cadenas",
    "Varios",
  ],
  Jardín: [
    "Herramientas de jardín",
    "Riego",
    "Macetas y sustrato",
    "Protección",
  ],
  Construcción: [
    "Aglomerantes",
    "Áridos y bloques",
    "Hierro y malla",
    "Auxiliares",
  ],
  Seguridad: ["Protección personal", "Señalización", "Emergencia", "Altura"],
};

export interface SeededVariant {
  id: string;
  basePriceBob: number;
}

const DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  "g",
);

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
    (SUBCATS[p.name] ?? ["General", "Otros", "Varios", "Más"]).map(
      (sub, ci) => ({
        id: catId(),
        slug: `${p.slug}-${slugify(sub)}`,
        name: `${sub}`,
        parentId: p.id,
        parentName: p.name,
        position: ci,
      }),
    ),
  );
  await prisma.category.createMany({
    data: [...parentRows, ...childRows.map(({ parentName: _p, ...c }) => c)],
  });
  const childIds = childRows.map((c) => c.id);
  const parentNameByChild = new Map(childRows.map((c) => [c.id, c.parentName]));
  const childByParent = new Map<string, string[]>();
  for (const c of childRows) {
    const list = childByParent.get(c.parentName) ?? [];
    list.push(c.id);
    childByParent.set(c.parentName, list);
  }

  // --- Productos + variantes -------------------------------------------------
  const prodId = idFactory("prod");
  const varId = idFactory("var");
  const usedSlugs = new Set<string>();
  let barcodeSeq = 7_501_000_000_000;

  const products: {
    id: string;
    slug: string;
    name: string;
    description: string;
    createdAt: Date;
  }[] = [];
  const variants: {
    id: string;
    productId: string;
    sku: string;
    barcode: string | null;
    basePriceBob: number;
    costBob: number;
    minStock: number;
    position: number;
  }[] = [];
  const productCategories: { productId: string; categoryId: string }[] = [];
  const initialMovements: {
    id: string;
    variantId: string;
    kind: "CARGA_INICIAL";
    qty: number;
    occurredAt: Date;
    sourceType: string;
  }[] = [];
  const movId = idFactory("mov");
  const seededVariants: SeededVariant[] = [];
  let productIndex = 0;

  const addProduct = (opts: {
    name: string;
    slug: string;
    description: string;
    categoryIds: string[];
    variantCount: number;
    fixedPriceBob?: number;
  }) => {
    const id = prodId();
    const i = productIndex++;
    let slug = opts.slug;
    if (usedSlugs.has(slug)) slug = `${slug}-${i}`;
    usedSlugs.add(slug);
    products.push({
      id,
      slug,
      name: opts.name,
      description: opts.description,
      createdAt: stockStartAt,
    });
    for (const categoryId of opts.categoryIds) {
      productCategories.push({ productId: id, categoryId });
    }
    for (let v = 0; v < opts.variantCount; v++) {
      const vid = varId();
      const base =
        opts.fixedPriceBob && v === 0
          ? opts.fixedPriceBob
          : rng.int(10, 1600) * 50; // centavos, múltiplos de 0,50
      variants.push({
        id: vid,
        productId: id,
        sku: `SKU-${i}-${v}`,
        // Una pizca sin código: alimenta la bandeja de etiquetas pendientes (§14.4).
        barcode: rng.bool(0.004) ? null : String(barcodeSeq++),
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
  };

  // Productos fijos (slugs estables, objetivos de búsqueda de la demo).
  for (const hero of HERO_PRODUCTS) {
    const pool = childByParent.get(hero.parent) ?? childIds;
    addProduct({
      name: hero.name,
      slug: hero.slug,
      description: productDescription(rng, hero.name),
      categoryIds: rng.sample(pool, 1),
      variantCount: 1,
      fixedPriceBob: hero.priceBob,
    });
  }

  // Resto del catálogo.
  for (let i = HERO_PRODUCTS.length; i < productCount; i++) {
    const categoryIds = rng.sample(childIds, rng.int(1, 2));
    const parentName = parentNameByChild.get(categoryIds[0]) ?? "Herramientas";
    const name = productName(rng, parentName);
    addProduct({
      name,
      slug: slugify(name),
      description: productDescription(rng, name),
      categoryIds,
      variantCount: rng.int(1, 4),
    });
  }

  await inBatches(products, 500, (b) => prisma.product.createMany({ data: b }));
  await inBatches(variants, 1000, (b) =>
    prisma.variant.createMany({ data: b }),
  );
  await inBatches(productCategories, 2000, (b) =>
    prisma.productCategory.createMany({ data: b, skipDuplicates: true }),
  );
  await inBatches(initialMovements, 1000, (b) =>
    prisma.stockMovement.createMany({ data: b }),
  );

  // --- Imágenes: pool corto subido una vez, asignado por turno --------------
  const pool = await seedImagePool(uploader);
  const imgId = idFactory("img");
  const imageRows: {
    id: string;
    productId: string;
    path: string;
    alt: string;
    position: number;
    blurDataUrl: string;
  }[] = [];
  products.forEach((p, i) => {
    const n = rng.int(1, 2);
    for (let k = 0; k < n; k++) {
      const poolIdx = (i + k) % pool.length;
      imageRows.push({
        id: imgId(),
        productId: p.id,
        path: pool[poolIdx],
        alt: p.name,
        position: k,
        blurDataUrl: gradientDataUri(poolIdx),
      });
    }
  });
  await inBatches(imageRows, 1000, (b) =>
    prisma.productImage.createMany({ data: b }),
  );

  // --- Descuentos: mayoría de producto/categoría; GLOBAL raro (distorsiona todo)
  const discId = idFactory("disc");
  for (let d = 0; d < 12; d++) {
    const scope = d === 0 ? "GLOBAL" : rng.bool(0.5) ? "CATEGORY" : "PRODUCT";
    await prisma.discount.create({
      data: {
        id: discId(),
        name: scope === "GLOBAL" ? "Aniversario" : `Promo ${d}`,
        scope,
        percent: rng.pick([5, 10, 15, 20, 25]),
        isActive: scope === "GLOBAL" ? false : rng.bool(0.7),
        categoryId: scope === "CATEGORY" ? rng.pick(childIds) : null,
        products:
          scope === "PRODUCT"
            ? {
                connect: rng
                  .sample(products, rng.int(3, 8))
                  .map((p) => ({ id: p.id })),
              }
            : undefined,
      },
    });
  }

  return seededVariants;
}
