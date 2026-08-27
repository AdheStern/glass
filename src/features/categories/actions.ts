"use server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";
import { type CategoryInput, CategoryInputSchema, slugify } from "./schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || "categoria";
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? root : `${root}-${n}`;
    const hit = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!hit || hit.id === exceptId) return slug;
  }
  return `${root}-${Date.now()}`;
}

export async function saveCategoryAction(
  raw: CategoryInput,
): Promise<ActionResult> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  const parsed = CategoryInputSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };
  const { id, name, parentId } = parsed.data;

  // Árbol de 2 niveles máximo (§5.3): un padre no puede tener padre.
  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { parentId: true },
    });
    if (!parent || parent.parentId) {
      return { ok: false, error: "La categoría padre no es válida" };
    }
  }

  if (id) {
    await prisma.category.update({
      where: { id },
      data: { name, parentId: parentId ?? null },
    });
  } else {
    const position = await prisma.category.count({
      where: { parentId: parentId ?? null },
    });
    await prisma.category.create({
      data: {
        name,
        slug: await uniqueSlug(name),
        parentId: parentId ?? null,
        position,
      },
    });
  }

  revalidateTag("catalog", "max");
  return { ok: true };
}

export async function archiveCategoryAction(id: string): Promise<ActionResult> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  const children = await prisma.category.count({
    where: { parentId: id, archivedAt: null },
  });
  if (children > 0)
    return { ok: false, error: "Primero archivá o movés las subcategorías" };

  await prisma.$transaction([
    prisma.productCategory.deleteMany({ where: { categoryId: id } }),
    prisma.category.update({ where: { id }, data: { archivedAt: new Date() } }),
  ]);
  revalidateTag("catalog", "max");
  return { ok: true };
}
