import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { getSiteSettings } from "@/db/settings";
import { CartButton } from "@/features/cart/components/cart-button";
import { SwRegister } from "@/features/catalog/components/sw-register";

// Zona pública: catálogo, producto, carrito, páginas, blog (§3.1).
// Presupuesto estricto (§20): sin "use client" sin justificar (§24.2 regla 3).
export default async function ShopLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getSiteSettings();

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: settings.name,
    ...(settings.address ? { address: settings.address } : {}),
    ...(Object.keys(settings.hours).length
      ? {
          openingHours: Object.entries(settings.hours).map(
            ([d, h]) => `${d} ${h}`,
          ),
        }
      : {}),
    ...(settings.whatsappNumbers[0]
      ? { telephone: settings.whatsappNumbers[0].e164 }
      : {}),
  };

  return (
    <div className="shop-surface flex flex-1 flex-col">
      <JsonLd data={localBusiness} />
      <SwRegister />
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            {settings.name}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/catalogo" className="hover:underline">
              Catálogo
            </Link>
            <Link href="/buscar" className="hover:underline">
              Buscar
            </Link>
            <CartButton />
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="mt-12 border-t border-black/10 py-8 text-center text-sm text-black/50">
        {settings.name}
        {settings.whatsappNumbers[0]
          ? ` · WhatsApp ${settings.whatsappNumbers[0].e164}`
          : ""}
      </footer>
    </div>
  );
}
