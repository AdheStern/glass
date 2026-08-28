import type { Metadata } from "next";
import { PosApp } from "@/features/pos/components/pos-app";

export const metadata: Metadata = {
  title: "Caja",
  robots: { index: false },
  manifest: "/pos.webmanifest",
};

// La caja es una app: dinámica, identidad por token de dispositivo (no Supabase).
export const instant = false;

export default function PosPage() {
  return <PosApp />;
}
