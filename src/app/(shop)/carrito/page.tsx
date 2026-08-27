import type { Metadata } from "next";
import { getSiteSettings } from "@/db/settings";
import { CartView } from "@/features/cart/components/cart-view";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false },
};

export default async function CarritoPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Tu pedido</h1>
      <CartView
        config={{
          siteName: settings.name,
          minOrderBob: settings.minOrderBob,
          whatsappNumbers: settings.whatsappNumbers,
          hours: settings.hours,
        }}
      />
    </div>
  );
}
