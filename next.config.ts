import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida mínima para la imagen de producción (§22.4). Genera .next/standalone/server.js.
  output: "standalone",
  reactCompiler: true,
  // Shell estático cacheado por etiqueta + precio/existencias en <Suspense> que
  // transmite en cada petición (§7.1). PPR es el comportamiento por defecto.
  cacheComponents: true,
  async rewrites() {
    return [
      {
        // Metadata RFC 9728 del recurso protegido MCP (Next ignora las carpetas
        // que empiezan con punto, así que el route handler vive en /api).
        source: "/.well-known/oauth-protected-resource/api/mcp",
        destination: "/api/mcp-metadata",
      },
    ];
  },
  async headers() {
    return [
      {
        // El service worker de la caja no se cachea: así una versión nueva del
        // shell llega en la siguiente carga (§22.8).
        source: "/pos-sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/pos" },
        ],
      },
    ];
  },
  images: {
    // Supabase Storage sirve las imágenes de producto. En Fase 1 son SVG del pool
    // de siembra; las fotos reales llegan en Fase 2.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
