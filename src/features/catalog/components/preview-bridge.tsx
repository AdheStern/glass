"use client";
// Glass — puente de vista previa del editor de apariencia (§10.3). Se monta SOLO
// cuando la URL trae `?preview=1` (el editor abre el catálogo real en un iframe).
// Escucha mensajes del MISMO origen y aplica los tokens en vivo: sin guardar, sin
// recargar. Es la única razón por la que hay "use client" en la superficie
// compradora (§6).
import { useEffect } from "react";

const STYLE_ID = "glass-preview-tokens";
const MESSAGE_TYPE = "glass:preview-tokens";

export function PreviewBridge() {
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; css?: string } | null;
      if (!data || data.type !== MESSAGE_TYPE || typeof data.css !== "string") {
        return;
      }
      let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
      }
      el.textContent = data.css;
    }

    window.addEventListener("message", onMessage);
    window.parent?.postMessage(
      { type: "glass:preview-ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}

export const PREVIEW_MESSAGE_TYPE = MESSAGE_TYPE;
