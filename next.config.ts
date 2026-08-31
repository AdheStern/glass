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

    // CSP sin `nonce`: con `cacheComponents` las respuestas se cachean y un nonce
    // por petición no puede cachearse, así que `script-src`/`style-src` llevan
    // `'unsafe-inline'` (el arranque de Next y el <style> de tokens del §10.2).
    // El contenido de usuario nunca se inyecta como HTML (el texto enriquecido es
    // un AST saneado, §11.1), así que el vector de XSS por script inline no
    // aplica. Igual bloquea: carga de scripts/estilos externos, plugins,
    // clickjacking, inyección de <base> y secuestro de formularios.
    // `'wasm-unsafe-eval'`: el PIN sin conexión del POS usa argon2id en WASM
    // (`hash-wasm`). Solo habilita compilar WebAssembly, no `eval()`.
    const scriptSrc =
      process.env.NODE_ENV === "production"
        ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"; // + HMR de Turbopack
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

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
        // Endurecimiento (§21).
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
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
