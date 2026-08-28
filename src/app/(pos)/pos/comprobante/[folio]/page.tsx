import type { Metadata } from "next";
import { ReceiptPage } from "@/features/pos/components/receipt-page";

export const metadata: Metadata = {
  title: "Comprobante",
  robots: { index: false },
};
export const instant = false;

export default async function Page({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = await params;
  return <ReceiptPage folio={decodeURIComponent(folio)} />;
}
