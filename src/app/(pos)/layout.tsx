import type { ReactNode } from "react";

// Caja (§3.1). Local primero: Dexie + cola de sincronización (Fase 6).
export default function PosLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
