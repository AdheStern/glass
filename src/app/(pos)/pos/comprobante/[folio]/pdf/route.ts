// Glass — comprobante de venta en PDF (§16.4). Valida el token de dispositivo.
import { PosAuthError } from "@/features/pos/device";
import { getReceipt } from "@/features/pos/receipt";
import { buildReceiptPdf } from "@/features/pos/receipt-pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ folio: string }> },
) {
  const { folio } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";

  let receipt: Awaited<ReturnType<typeof getReceipt>>;
  try {
    receipt = await getReceipt(token, decodeURIComponent(folio));
  } catch (e) {
    if (e instanceof PosAuthError) {
      return new Response("Dispositivo no autorizado", { status: 401 });
    }
    throw e;
  }
  if (!receipt)
    return new Response("Comprobante no encontrado", { status: 404 });

  const bytes = await buildReceiptPdf(receipt);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${receipt.folio}.pdf"`,
    },
  });
}
