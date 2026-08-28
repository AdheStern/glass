import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

// Caja (§3.1). En línea en la Fase 5; Dexie + cola de sincronización en la Fase 6.
export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      {children}
      <Toaster />
    </div>
  );
}
