import "server-only";
// Glass — PDF de reporte con la marca del comercio (§18.2: "lleva el logo de su
// negocio, no el de DIMA"). A4 vertical, tabla simple. Patrón de
// src/features/pos/receipt-pdf.ts.
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const MM = 2.83465;
const A4 = { w: 210 * MM, h: 297 * MM };
const MARGIN = 16 * MM;

export interface ReportPdfInput {
  siteName: string;
  title: string;
  subtitle?: string;
  columns: { label: string; align?: "left" | "right" }[];
  rows: string[][];
  totals?: string[];
}

export async function buildReportPdf(
  input: ReportPdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const usableW = A4.w - 2 * MARGIN;
  const colW = usableW / input.columns.length;
  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;

  const drawHeader = () => {
    page.drawText(input.siteName, { x: MARGIN, y, size: 14, font: bold });
    y -= 16;
    page.drawText(input.title, { x: MARGIN, y, size: 11, font: bold });
    y -= 12;
    if (input.subtitle) {
      page.drawText(input.subtitle, {
        x: MARGIN,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 12;
    }
    y -= 4;
    input.columns.forEach((c, i) => {
      const cx = MARGIN + i * colW;
      const t = c.label;
      const tw = c.align === "right" ? bold.widthOfTextAtSize(t, 8) : 0;
      page.drawText(t, {
        x: c.align === "right" ? cx + colW - tw - 4 : cx,
        y,
        size: 8,
        font: bold,
      });
    });
    y -= 4;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4.w - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 12;
  };

  const drawRow = (cells: string[], useBold = false) => {
    if (y < MARGIN + 20) {
      page = doc.addPage([A4.w, A4.h]);
      y = A4.h - MARGIN;
      drawHeader();
    }
    cells.forEach((cell, i) => {
      const c = input.columns[i];
      const cx = MARGIN + i * colW;
      const f = useBold ? bold : font;
      const text = cell.length > 40 ? `${cell.slice(0, 39)}…` : cell;
      const tw = c?.align === "right" ? f.widthOfTextAtSize(text, 8) : 0;
      page.drawText(text, {
        x: c?.align === "right" ? cx + colW - tw - 4 : cx,
        y,
        size: 8,
        font: f,
      });
    });
    y -= 12;
  };

  drawHeader();
  for (const r of input.rows) drawRow(r);
  if (input.totals) {
    y -= 2;
    page.drawLine({
      start: { x: MARGIN, y: y + 8 },
      end: { x: A4.w - MARGIN, y: y + 8 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    drawRow(input.totals, true);
  }

  return doc.save();
}
