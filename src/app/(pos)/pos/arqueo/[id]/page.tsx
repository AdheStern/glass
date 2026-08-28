import type { Metadata } from "next";
import { ArqueoPage } from "@/features/pos/components/arqueo-page";

export const metadata: Metadata = { title: "Arqueo", robots: { index: false } };
export const instant = false;

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArqueoPage sessionId={id} />;
}
