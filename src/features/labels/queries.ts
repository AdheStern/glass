import "server-only";
import { prisma } from "@/db/client";
import type { LabelInput } from "./pdf";

export interface LabelQueueRow {
  variantId: string;
  productName: string;
  variantLabel: string | null;
  barcode: string | null;
  basePriceBob: number;
}

/** Variantes sin código de barras: la bandeja de etiquetas pendientes (§14.4). */
export async function getLabelQueue(): Promise<LabelQueueRow[]> {
  const variants = await prisma.variant.findMany({
    where: {
      archivedAt: null,
      product: { archivedAt: null },
      OR: [{ barcode: null }, { barcode: "" }],
    },
    orderBy: { product: { name: "asc" } },
    take: 500,
    include: { product: { select: { name: true } } },
  });
  return variants.map((v) => ({
    variantId: v.id,
    productName: v.product.name,
    variantLabel:
      (v.attributes as { variante?: string } | null)?.variante ?? null,
    barcode: v.barcode,
    basePriceBob: v.basePriceBob,
  }));
}

/** Datos para imprimir; descarta las que aún no tienen código. */
export async function getLabelData(
  variantIds: string[],
): Promise<LabelInput[]> {
  if (variantIds.length === 0) return [];
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds }, barcode: { not: null } },
    include: { product: { select: { name: true } } },
  });
  return variants
    .filter((v) => v.barcode && v.barcode.length > 0)
    .map((v) => {
      const variante = (v.attributes as { variante?: string } | null)?.variante;
      return {
        name: variante ? `${v.product.name} — ${variante}` : v.product.name,
        barcode: v.barcode as string,
        priceBob: v.basePriceBob,
      };
    });
}
