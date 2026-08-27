"use server";
import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";
import { slugify } from "@/features/products/schemas";
import {
  type FieldKey,
  ImportRowSchema,
  type MappingRequest,
  parseMoneyBs,
} from "./schema";

export interface RowError {
  row: number;
  message: string;
}

export interface ImportResult {
  ok: boolean;
  batchId?: string;
  created?: number;
  updated?: number;
  errors?: RowError[];
  error?: string;
}

function normalizeRows(req: MappingRequest) {
  const byField = new Map<FieldKey, string>();
  for (const [header, field] of Object.entries(req.mapping)) {
    if (field) byField.set(field, header);
  }
  const get = (r: Record<string, string>, f: FieldKey) => {
    const h = byField.get(f);
    return h ? (r[h] ?? "").trim() : "";
  };

  const errors: RowError[] = [];
  const rows: {
    name: string;
    priceBob: number;
    barcode?: string;
    sku?: string;
    category?: string;
    description?: string;
    stock?: number;
  }[] = [];

  req.rows.forEach((raw, i) => {
    const priceBob = parseMoneyBs(get(raw, "priceBs"));
    const stockRaw = get(raw, "stock");
    const parsed = ImportRowSchema.safeParse({
      name: get(raw, "name"),
      priceBob: priceBob ?? -1,
      barcode: get(raw, "barcode") || undefined,
      sku: get(raw, "sku") || undefined,
      category: get(raw, "category") || undefined,
      description: get(raw, "description") || undefined,
      stock: stockRaw ? Number(stockRaw.replace(/[^\d]/g, "")) || 0 : undefined,
    });
    if (priceBob == null) {
      errors.push({ row: i + 1, message: "Precio ilegible" });
      return;
    }
    if (!parsed.success) {
      errors.push({
        row: i + 1,
        message: parsed.error.issues[0]?.message ?? "Fila inválida",
      });
      return;
    }
    rows.push(parsed.data);
  });

  return { rows, errors };
}

export async function applyImportAction(
  req: MappingRequest,
): Promise<ImportResult> {
  const actor = await requireRole("PROPIETARIO", "ADMINISTRADOR");

  if (
    !Object.values(req.mapping).includes("name") ||
    !Object.values(req.mapping).includes("priceBs")
  ) {
    return { ok: false, error: "Falta mapear el nombre y el precio" };
  }

  const { rows, errors } = normalizeRows(req);
  // §19.2: nada se escribe hasta que todo valida.
  if (errors.length > 0) {
    return { ok: false, errors, error: `${errors.length} fila(s) con errores` };
  }
  if (rows.length === 0)
    return { ok: false, error: "El archivo no tiene filas" };

  const createdProductIds: string[] = [];
  const createdCategoryIds: string[] = [];
  let created = 0;
  let updated = 0;

  await prisma.$transaction(
    async (tx) => {
      // Categorías al vuelo (§19.2)
      const catCache = new Map<string, string>();
      const resolveCategory = async (name: string): Promise<string> => {
        const key = name.toLowerCase();
        const cached = catCache.get(key);
        if (cached) return cached;
        const existing = await tx.category.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            archivedAt: null,
          },
          select: { id: true },
        });
        if (existing) {
          catCache.set(key, existing.id);
          return existing.id;
        }
        const position = await tx.category.count({ where: { parentId: null } });
        const cat = await tx.category.create({
          data: {
            name,
            slug: `${slugify(name)}-${Date.now().toString(36)}`,
            position,
          },
        });
        catCache.set(key, cat.id);
        createdCategoryIds.push(cat.id);
        return cat.id;
      };

      for (const row of rows) {
        const key = row.barcode || row.sku;
        const match = key
          ? await tx.variant.findFirst({
              where: row.barcode ? { barcode: row.barcode } : { sku: row.sku },
              select: { id: true, productId: true },
            })
          : null;

        const categoryId = row.category
          ? await resolveCategory(row.category)
          : null;

        if (match) {
          await tx.variant.update({
            where: { id: match.id },
            data: { basePriceBob: row.priceBob },
          });
          await tx.product.update({
            where: { id: match.productId },
            data: {
              name: row.name,
              ...(row.description ? { description: row.description } : {}),
            },
          });
          if (categoryId) {
            await tx.productCategory.upsert({
              where: {
                productId_categoryId: {
                  productId: match.productId,
                  categoryId,
                },
              },
              create: { productId: match.productId, categoryId },
              update: {},
            });
          }
          updated++;
        } else {
          const product = await tx.product.create({
            data: {
              name: row.name,
              slug: `${slugify(row.name)}-${createdProductIds.length}-${Date.now().toString(36)}`,
              description: row.description ?? null,
              categories: categoryId ? { create: { categoryId } } : undefined,
              variants: {
                create: {
                  barcode: row.barcode ?? null,
                  sku: row.sku ?? null,
                  basePriceBob: row.priceBob,
                },
              },
            },
            include: { variants: { select: { id: true } } },
          });
          createdProductIds.push(product.id);
          if (row.stock && row.stock > 0) {
            await tx.stockMovement.create({
              data: {
                variantId: product.variants[0].id,
                kind: "CARGA_INICIAL",
                qty: row.stock,
                occurredAt: new Date(),
                sourceType: "import",
              },
            });
          }
          created++;
        }
      }

      const batch = await tx.importBatch.create({
        data: {
          createdByUserId: actor.id,
          rowCount: rows.length,
          createdCount: created,
          updatedCount: updated,
          createdProductIds:
            createdProductIds as unknown as Prisma.InputJsonValue,
          createdCategoryIds:
            createdCategoryIds as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "import.apply",
          entity: "import_batch",
          entityId: batch.id,
          actorType: "user",
          actorId: actor.id,
          after: { created, updated, rows: rows.length },
        },
      });
      return batch;
    },
    { timeout: 120_000 },
  );

  const batch = await prisma.importBatch.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  revalidateTag("catalog", "max");
  revalidateTag("featured", "max");
  return { ok: true, batchId: batch?.id, created, updated };
}

export async function undoImportAction(
  batchId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.status === "UNDONE")
    return { ok: false, error: "Nada que deshacer" };
  if (Date.now() - batch.createdAt.getTime() > 24 * 3600 * 1000) {
    return { ok: false, error: "El plazo de 24 h para deshacer venció" };
  }

  const productIds = (batch.createdProductIds as string[]) ?? [];
  const categoryIds = (batch.createdCategoryIds as string[]) ?? [];

  await prisma.$transaction(async (tx) => {
    if (productIds.length) {
      await tx.variant.updateMany({
        where: { productId: { in: productIds } },
        data: { archivedAt: new Date() },
      });
      await tx.product.updateMany({
        where: { id: { in: productIds } },
        data: { archivedAt: new Date(), isActive: false },
      });
    }
    for (const categoryId of categoryIds) {
      const stillUsed = await tx.productCategory.count({
        where: { categoryId },
      });
      if (stillUsed === 0) {
        await tx.category.update({
          where: { id: categoryId },
          data: { archivedAt: new Date() },
        });
      }
    }
    await tx.importBatch.update({
      where: { id: batchId },
      data: { status: "UNDONE", undoneAt: new Date() },
    });
  });

  revalidateTag("catalog", "max");
  revalidateTag("featured", "max");
  return { ok: true };
}
