import type { Metadata } from "next";
import { CloseShiftPage } from "@/features/pos/components/close-shift-page";

export const metadata: Metadata = {
  title: "Cerrar turno",
  robots: { index: false },
};
export const instant = false;

export default function Page() {
  return <CloseShiftPage />;
}
