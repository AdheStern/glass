import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida mínima para la imagen de producción (§22.4). Genera .next/standalone/server.js.
  output: "standalone",
  reactCompiler: true,
  // Shell estático cacheado por etiqueta + precio/existencias en <Suspense> que
  // transmite en cada petición (§7.1). PPR es el comportamiento por defecto.
  cacheComponents: true,
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
