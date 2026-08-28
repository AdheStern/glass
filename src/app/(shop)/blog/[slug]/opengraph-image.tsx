// Glass — imagen para compartir de una entrada: el título sobre los colores de
// la marca (§11.2).
import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/db/settings";
import { getPostBySlug } from "@/features/content/queries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Entrada del blog";

export default async function BlogOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getPostBySlug(slug),
    getSiteSettings(),
  ]);

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
          fontSize: 26,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        {settings.name} · Blog
      </div>
      <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.1 }}>
        {post?.title ?? "Blog"}
      </div>
      <div style={{ fontSize: 24, opacity: 0.6 }}>{post?.authorName ?? ""}</div>
    </div>,
    size,
  );
}
