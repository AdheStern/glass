// Glass — imagen para compartir (§20.2). Es lo que se ve al pegar el enlace en
// WhatsApp: importa más que cualquier otra optimización de SEO.
import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/catalog/queries";
import { getSiteSettings } from "@/db/settings";
import { formatBob } from "@/domain/money";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Producto";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
  ]);

  const name = product?.name ?? settings.name;
  const fromPrice = product?.variants.length
    ? Math.min(...product.variants.map((v) => v.basePriceBob))
    : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #2b1b4d 0%, #1a1420 100%)",
        color: "#faf8f7",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 28,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        {settings.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>
          {name}
        </div>
        {fromPrice != null && (
          <div style={{ fontSize: 44, fontWeight: 700, color: "#ff7a59" }}>
            {(product && product.variants.length > 1 ? "Desde " : "") +
              formatBob(fromPrice)}
          </div>
        )}
      </div>
      <div style={{ fontSize: 26, opacity: 0.6 }}>Pedí por WhatsApp</div>
    </div>,
    size,
  );
}
