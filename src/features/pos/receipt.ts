import "server-only";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { requireDevice } from "./device";

export interface ReceiptView {
  folio: string;
  siteName: string;
  deviceName: string;
  operatorName: string;
  occurredAt: Date;
  voidedAt: Date | null;
  items: {
    name: string;
    qty: number;
    unitPriceBob: number;
    lineBob: number;
  }[];
  subtotalBob: number;
  discountBob: number;
  roundingBob: number;
  totalBob: number;
  payments: { label: string; amountBob: number }[];
  footer: string;
}

const DEFAULT_FOOTER = "Nota de venta · no válida como factura";

export async function getReceipt(
  token: string,
  folio: string,
): Promise<ReceiptView | null> {
  await requireDevice(token);
  const sale = await prisma.sale.findUnique({
    where: { folio: folio.trim().toUpperCase() },
    include: {
      operator: { select: { name: true } },
      device: { select: { name: true } },
      items: {
        include: {
          variant: {
            select: { attributes: true, product: { select: { name: true } } },
          },
        },
      },
      payments: { include: { method: { select: { label: true } } } },
    },
  });
  if (!sale) return null;
  const settings = await getSiteSettings();

  return {
    folio: sale.folio,
    siteName: settings.name,
    deviceName: sale.device.name,
    operatorName: sale.operator.name,
    occurredAt: sale.occurredAtDevice,
    voidedAt: sale.voidedAt,
    items: sale.items.map((it) => {
      const variante = (it.variant.attributes as { variante?: string } | null)
        ?.variante;
      return {
        name: variante
          ? `${it.variant.product.name} · ${variante}`
          : it.variant.product.name,
        qty: it.qty,
        unitPriceBob: it.unitPriceBob,
        lineBob: it.unitPriceBob * it.qty,
      };
    }),
    subtotalBob: sale.subtotalBob,
    discountBob: sale.discountBob,
    roundingBob: sale.roundingBob,
    totalBob: sale.totalBob,
    payments: sale.payments.map((p) => ({
      label: p.method.label,
      amountBob: p.amountBob,
    })),
    footer: settings.receiptFooter?.trim() || DEFAULT_FOOTER,
  };
}
