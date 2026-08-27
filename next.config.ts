import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida mínima para la imagen de producción (§22.4). Genera .next/standalone/server.js.
  output: "standalone",
  reactCompiler: true,
  images: {
    // Supabase Storage sirve las imágenes de producto. El host real se toma de la env
    // en tiempo de ejecución; en dev apunta al proyecto Supabase configurado.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
    ],
  },
};

export default nextConfig;
