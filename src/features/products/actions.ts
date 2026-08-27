"use server";
// Glass — altas/bajas/modificaciones de productos (§24.1: …Action; valida rol y zod).
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";
import { type ProductInput, ProductInputSchema, slugify } from "./schemas";

export interface ActionResult {
  ok: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function revalidateCatalog(productId?: string) {
  revalidateTag("catalog", "max");
  revalidateTag("featured", "max");
  if (productId) revalidateTag(`product:${productId}`, "max");
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || "producto";
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? root : `${root}-${n}`;
    const hit = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!hit || hit.id === exceptId) return slug;
  }
  return `${root}-${Date.now()}`;
}

export async function saveProductAction(
  raw: ProductInput,
): Promise<ActionResult> {
  const actor = await requireRole("PROPIETARIO", "ADMINISTRADOR");

  const parsed = ProductInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, error: "Revisá los datos", fieldErrors };
  }
  const data = parsed.data;

  // Código de barras único entre variantes del formulario
  const barcodes = data.variants.map((v) => v.barcode).filter(Boolean);
  if (new Set(barcodes).size !== barcodes.length) {
    return { ok: false, error: "Hay códigos de barras repetidos" };
  }

  if (data.id) {
    return updateProduct(data.id, data, actor.id);
  }
  return createProduct(data, actor.id);
}

async function createProduct(
  data: ReturnType<typeof ProductInputSchema.parse>,
  actorId: string,
): Promise<ActionResult> {
  const slug = await uniqueSlug(data.slug || data.name);

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        slug,
        name: data.name,
        description: data.description || null,
        isActive: data.isActive,
        trackStock: data.trackStock,
        categories: {
          create: data.categoryIds.map((categoryId) => ({ categoryId })),
        },
        variants: {
          create: data.variants.map((v, i) => ({
            sku: v.sku || null,
            barcode: v.barcode || null,
            attributes: v.attributes ?? undefined,
            basePriceBob: v.basePriceBob,
            costBob: v.costBob ?? null,
            minStock: v.minStock,
            position: i,
          })),
        },
      },
      include: { variants: { select: { id: true } } },
    });

    await tx.auditLog.create({
      data: {
        action: "product.create",
        entity: "product",
        entityId: p.id,
        actorType: "user",
        actorId,
        after: { name: p.name, slug: p.slug },
      },
    });
    return p;
  });

  revalidateCatalog(product.id);
  return { ok: true, id: product.id };
}

async function updateProduct(
  id: string,
  data: ReturnType<typeof ProductInputSchema.parse>,
  actorId: string,
): Promise<ActionResult> {
  const current = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        where: { archivedAt: null },
        select: { id: true, basePriceBob: true },
      },
    },
  });
  if (!current || current.archivedAt)
    return { ok: false, error: "Producto no encontrado" };

  const slug = data.slug ? await uniqueSlug(data.slug, id) : current.slug;
  const keptIds = new Set(data.variants.map((v) => v.id).filter(Boolean));
  const toArchive = current.variants.filter((v) => !keptIds.has(v.id));

  await prisma.$transaction(async (tx) => {
    if (slug !== current.slug) {
      await tx.slugHistory.upsert({
        where: { entity_oldSlug: { entity: "product", oldSlug: current.slug } },
        create: { entity: "product", oldSlug: current.slug, newSlug: slug },
        update: { newSlug: slug },
      });
    }

    await tx.product.update({
      where: { id },
      data: {
        slug,
        name: data.name,
        description: data.description || null,
        isActive: data.isActive,
        trackStock: data.trackStock,
      },
    });

    // Categorías: reemplazo completo
    await tx.productCategory.deleteMany({ where: { productId: id } });
    if (data.categoryIds.length) {
      await tx.productCategory.createMany({
        data: data.categoryIds.map((categoryId) => ({
          productId: id,
          categoryId,
        })),
        skipDuplicates: true,
      });
    }

    // Variantes: upsert por id, archivar las quitadas
    for (let i = 0; i < data.variants.length; i++) {
      const v = data.variants[i];
      const payload = {
        sku: v.sku || null,
        barcode: v.barcode || null,
        attributes: v.attributes ?? undefined,
        basePriceBob: v.basePriceBob,
        costBob: v.costBob ?? null,
        minStock: v.minStock,
        position: i,
      };
      if (v.id) {
        await tx.variant.update({ where: { id: v.id }, data: payload });
      } else {
        await tx.variant.create({ data: { ...payload, productId: id } });
      }
    }
    if (toArchive.length) {
      await tx.variant.updateMany({
        where: { id: { in: toArchive.map((v) => v.id) } },
        data: { archivedAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        action: "product.update",
        entity: "product",
        entityId: id,
        actorType: "user",
        actorId,
        before: { name: current.name, slug: current.slug },
        after: { name: data.name, slug },
      },
    });
  });

  revalidateCatalog(id);
  return { ok: true, id };
}

export async function archiveProductAction(id: string): Promise<ActionResult> {
  const actor = await requireRole("PROPIETARIO", "ADMINISTRADOR");
  await prisma.product.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      action: "product.archive",
      entity: "product",
      entityId: id,
      actorType: "user",
      actorId: actor.id,
    },
  });
  revalidateCatalog(id);
  return { ok: true, id };
}

export async function setProductActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  await prisma.product.update({ where: { id }, data: { isActive } });
  revalidateCatalog(id);
  return { ok: true, id };
}
