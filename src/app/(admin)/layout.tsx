import type { ReactNode } from "react";

// Panel de administración (§3.1). Zona cliente, sin obsesión por el peso.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
