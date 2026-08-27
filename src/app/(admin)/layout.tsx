import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

// Panel de administración (§3.1). Zona cliente, sin obsesión por el peso (§8.3).
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col">
      {children}
      <Toaster position="top-center" richColors />
    </div>
  );
}
