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
    const noCacheSw = [{ key: "Cache-Control", value: "no-cache" }];
    return [
      {
        // Los service workers no se cachean: una versión nueva del shell llega
        // en la siguiente carga (§22.8).
        source: "/pos-sw.js",
        headers: [
          ...noCacheSw,
          { key: "Service-Worker-Allowed", value: "/pos" },
        ],
      },
      { source: "/catalogo-sw.js", headers: noCacheSw },
      {
        // Endurecimiento básico (§21). La CSP completa queda pendiente: rompería
        // el <style> de tokens y el iframe de la vista previa.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
