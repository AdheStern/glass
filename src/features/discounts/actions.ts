"use server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";
import { getDiscountForEdit } from "./queries";
import { type DiscountInput, DiscountInputSchema } from "./schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function loadDiscountForEditAction(id: string) {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  return getDiscountForEdit(id);
}

async function resolveProductIds(refs?: string): Promise<string[]> {
  const tokens = (refs ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.length === 0) return [];
  const variants = await prisma.variant.findMany({
    where: { OR: [{ barcode: { in: tokens } }, { sku: { in: tokens } }] },
    select: { productId: true },
  });
  return [...new Set(variants.map((v) => v.productId))];
}

export async function saveDiscountAction(
  raw: DiscountInput,
): Promise<ActionResult> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  const parsed = DiscountInputSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const data = {
    name: d.name,
    scope: d.scope,
    percent: d.kind === "PERCENT" ? (d.percent ?? null) : null,
    amountBob: d.kind === "AMOUNT" ? Math.round((d.amountBs ?? 0) * 100) : null,
    categoryId: d.scope === "CATEGORY" ? (d.categoryId ?? null) : null,
    startsAt: d.startsAt ? new Date(d.startsAt) : null,
    endsAt: d.endsAt ? new Date(`${d.endsAt}T23:59:59`) : null,
    isActive: d.isActive,
  };

  const productIds =
    d.scope === "PRODUCT" ? await resolveProductIds(d.productRefs) : [];

  if (d.id) {
    await prisma.discount.update({
      where: { id: d.id },
      data: {
        ...data,
        products:
          d.scope === "PRODUCT"
            ? { set: productIds.map((id) => ({ id })) }
            : { set: [] },
      },
    });
  } else {
    await prisma.discount.create({
      data: {
        ...data,
        products:
          d.scope === "PRODUCT"
            ? { connect: productIds.map((id) => ({ id })) }
            : undefined,
      },
    });
  }

  revalidateTag("catalog", "max");
  revalidateTag("featured", "max");
  return {
    ok: true,
    ...(d.scope === "PRODUCT" && productIds.length === 0
      ? {
          error:
            "Guardado, pero no se encontró ningún producto con esos códigos",
        }
      : {}),
  };
}

export async function toggleDiscountAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  await prisma.discount.update({ where: { id }, data: { isActive } });
  revalidateTag("catalog", "max");
  revalidateTag("featured", "max");
  return { ok: true };
}

export async function archiveDiscountAction(id: string): Promise<ActionResult> {
  await requireRole("PROPIETARIO", "ADMINISTRADOR");
  await prisma.discount.update({
    where: { id },
    data: { archivedAt: new Date(), isActive: false },
  });
  revalidateTag("catalog", "max");
  revalidateTag("featured", "max");
  return { ok: true };
}
