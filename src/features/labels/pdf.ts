import "server-only";
// Glass — etiquetas por lote (§15.2). PDF A4 con una grilla de etiquetas de
// 50×25 mm o 38×19 mm. Las barras se dibujan como rectángulos desde el
// codificador puro de src/domain (Code-128, o EAN-13 si el código son 12-13
// dígitos).
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { type Barcode, code128, ean13 } from "@/domain/barcode";
import { formatBob } from "@/domain/money";

export type LabelSize = "50x25" | "38x19";

export interface LabelInput {
  name: string;
  barcode: string;
  priceBob: number;
}

const MM = 2.83465; // pt por mm
const A4 = { w: 210 * MM, h: 297 * MM };
const GUTTER = 2 * MM;
const PAGE_MARGIN = 8 * MM;

const SIZES: Record<LabelSize, { w: number; h: number }> = {
  "50x25": { w: 50 * MM, h: 25 * MM },
  "38x19": { w: 38 * MM, h: 19 * MM },
};

function encode(value: string): Barcode {
  const digits = value.replace(/\D/g, "");
  if (
    (digits.length === 12 || digits.length === 13) &&
    digits === value.trim()
  ) {
    try {
      return ean13(value);
    } catch {
      // cae a Code-128
    }
  }
  return code128(value);
}

export async function buildLabelsPdf(
  labels: LabelInput[],
  size: LabelSize,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const cell = SIZES[size];

  const cols = Math.max(
    1,
    Math.floor((A4.w - 2 * PAGE_MARGIN + GUTTER) / (cell.w + GUTTER)),
  );
  const rows = Math.max(
    1,
    Math.floor((A4.h - 2 * PAGE_MARGIN + GUTTER) / (cell.h + GUTTER)),
  );
  const perPage = cols * rows;
  const gridW = cols * cell.w + (cols - 1) * GUTTER;
  const originX = (A4.w - gridW) / 2;

  labels.forEach((label, i) => {
    const slot = i % perPage;
    if (slot === 0) doc.addPage([A4.w, A4.h]);
    const page = doc.getPages()[doc.getPageCount() - 1];

    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = originX + col * (cell.w + GUTTER);
    const y = A4.h - PAGE_MARGIN - (row + 1) * cell.h - row * GUTTER;

    drawLabel(page, font, fontBold, x, y, cell, label);
  });

  return doc.save();
}

function drawLabel(
  // biome-ignore lint/suspicious/noExplicitAny: PDFPage de pdf-lib, evitamos arrastrar el tipo
  page: any,
  // biome-ignore lint/suspicious/noExplicitAny: PDFFont
  font: any,
  // biome-ignore lint/suspicious/noExplicitAny: PDFFont
  fontBold: any,
  x: number,
  y: number,
  cell: { w: number; h: number },
  label: LabelInput,
) {
  const pad = 2 * MM;
  page.drawRectangle({
    x,
    y,
    width: cell.w,
    height: cell.h,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 0.5,
  });

  // Nombre corto (una línea, recortado)
  const maxChars = Math.floor((cell.w - 2 * pad) / 4.2);
  const name =
    label.name.length > maxChars
      ? `${label.name.slice(0, maxChars - 1)}…`
      : label.name;
  page.drawText(name, {
    x: x + pad,
    y: y + cell.h - pad - 6,
    size: 6.5,
    font: fontBold,
  });

  // Barras
  const bc = encode(label.barcode);
  const barsAreaH = cell.h * 0.42;
  const barsAreaW = cell.w - 2 * pad;
  const moduleW = barsAreaW / bc.modules;
  const barsY = y + cell.h * 0.28;
  let cursor = x + pad;
  bc.bars.forEach((width, idx) => {
    const w = width * moduleW;
    if (idx % 2 === 0) {
      page.drawRectangle({
        x: cursor,
        y: barsY,
        width: w,
        height: barsAreaH,
        color: rgb(0, 0, 0),
      });
    }
    cursor += w;
  });

  page.drawText(bc.text, {
    x: x + pad,
    y: y + cell.h * 0.14,
    size: 5.5,
    font,
  });
  page.drawText(formatBob(label.priceBob), {
    x: x + pad,
    y: y + pad,
    size: 8,
    font: fontBold,
  });
}
