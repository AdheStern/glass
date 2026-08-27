import type { ReactNode } from "react";

// Zona pública: catálogo, producto, carrito, páginas, blog (§3.1).
// Presupuesto estricto (§20): sin "use client" sin justificar (§24.2 regla 3).
export default function ShopLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
