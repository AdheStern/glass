"use client";
// Glass — registra el service worker del catálogo (§22.8). Único "use client" de
// esta superficie junto a la vista previa del editor: ~30 líneas, sin efecto en
// el render. Solo cachea assets estáticos; no da modo sin conexión.
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const t = setTimeout(() => {
      navigator.serviceWorker
        .register("/catalogo-sw.js", { scope: "/" })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
