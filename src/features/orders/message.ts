// Glass — mensaje de WhatsApp del pedido (§9.3). Puro.
import { formatBob } from "@/domain/money";

export interface MessageItem {
  qty: number;
  nameSnapshot: string;
  unitPriceBob: number;
  listPriceBob: number;
}

export interface MessageInput {
  siteName: string;
  siteUrl: string;
  folio: string;
  items: MessageItem[];
  totalBob: number;
  customerName?: string;
  note?: string;
  template?: string | null;
}

const MAX_LINES = 15;

function itemLine(it: MessageItem): string {
  const discounted = it.listPriceBob > it.unitPriceBob;
  const suffix = discounted ? `  (antes ${formatBob(it.listPriceBob)})` : "";
  return `• ${it.qty}× ${it.nameSnapshot} — ${formatBob(it.unitPriceBob * it.qty)}${suffix}`;
}

/** Devuelve el texto del mensaje. Si supera 15 líneas, resume y remite al enlace. */
export function buildOrderMessage(input: MessageInput): string {
  const header = (
    input.template?.trim() || "Hola {nombreComercio}! Quiero hacer este pedido:"
  ).replace("{nombreComercio}", input.siteName);
  const detailUrl = `${input.siteUrl.replace(/\/$/, "")}/pedido/${input.folio}`;

  const full = [
    header,
    "",
    ...input.items.map(itemLine),
    "",
    `Total: ${formatBob(input.totalBob)}`,
    input.customerName ? `A nombre de: ${input.customerName}` : null,
    input.note ? `Nota: ${input.note}` : null,
    `Pedido N.º ${input.folio}`,
    `Ver detalle: ${detailUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  if (full.split("\n").length <= MAX_LINES + 3) return full;

  const totalQty = input.items.reduce((n, i) => n + i.qty, 0);
  return [
    header,
    "",
    `${totalQty} artículos · Total: ${formatBob(input.totalBob)}`,
    input.customerName ? `A nombre de: ${input.customerName}` : null,
    `Pedido N.º ${input.folio}`,
    `Detalle completo: ${detailUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function waLink(e164: string, message: string): string {
  const phone = e164.replace(/[^\d]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
