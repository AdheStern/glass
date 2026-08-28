import "server-only";
// Comprobante en PDF, formato ticket angosto (§16.4).
import { PDFDocument, StandardFonts } from "pdf-lib";
import { formatBob } from "@/domain/money";
import type { ReceiptView } from "./receipt";

const MM = 2.83465;
const W = 72 * MM; // rollo de 72 mm

export async function buildReceiptPdf(r: ReceiptView): Promise<Uint8Array> {
  const rows = 14 + r.items.length + r.payments.length;
  const H = Math.max(120, 40 + rows * 6) * MM;
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pad = 5 * MM;
  let y = H - pad;

  const line = (
    text: string,
    opts: { size?: number; bold?: boolean; right?: string } = {},
  ) => {
    const size = opts.size ?? 8;
    page.drawText(text, { x: pad, y, size, font: opts.bold ? bold : font });
    if (opts.right) {
      const w = (opts.bold ? bold : font).widthOfTextAtSize(opts.right, size);
      page.drawText(opts.right, {
        x: W - pad - w,
        y,
        size,
        font: opts.bold ? bold : font,
      });
    }
    y -= size + 3;
  };

  line(r.siteName, { size: 11, bold: true });
  line(`${r.deviceName} · ${r.operatorName}`);
  line(`${r.folio} · ${r.occurredAt.toLocaleString("es-BO")}`);
  if (r.voidedAt) line("*** ANULADA ***", { bold: true });
  y -= 3;

  for (const it of r.items) {
    line(`${it.qty}x ${it.name}`.slice(0, 42), {
      right: formatBob(it.lineBob),
    });
  }
  y -= 3;
  if (r.discountBob > 0)
    line("Descuento", { right: `-${formatBob(r.discountBob)}` });
  if (r.roundingBob !== 0)
    line("Redondeo", { right: formatBob(r.roundingBob) });
  line("TOTAL", { bold: true, size: 10, right: formatBob(r.totalBob) });
  y -= 3;
  for (const p of r.payments) line(p.label, { right: formatBob(p.amountBob) });
  y -= 6;
  line(r.footer, { size: 7 });

  return doc.save();
}
