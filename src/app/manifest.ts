import { formatHex, oklch } from "culori";
import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/db/settings";

// Manifiesto del catálogo (§22.8): instalable, pantalla mínima con navegador.
// El POS tiene su propio /pos.webmanifest (la página /pos lo referencia y
// sobreescribe a este). "quien mira el catálogo no debe poder instalar la caja".
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSiteSettings();
  const theme = formatHex(oklch(s.brandColor) ?? undefined) ?? "#1f2937";

  return {
    name: s.name,
    short_name: s.name.slice(0, 16),
    description: "Catálogo en línea y pedidos por WhatsApp.",
    start_url: "/",
    scope: "/",
    display: "minimal-ui",
    background_color: "#ffffff",
    theme_color: theme,
    icons: [
      {
        src: "/catalogo-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
