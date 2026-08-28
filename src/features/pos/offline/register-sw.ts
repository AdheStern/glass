"use client";
// Glass — registro del service worker de la caja (§22.8). El SW cachea el
// app-shell de /pos para poder reabrir la caja sin red.

export function registerPosServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  const go = () => {
    navigator.serviceWorker
      .register("/pos-sw.js", { scope: "/pos" })
      .catch(() => {
        // sin SW la caja sigue con red; solo pierde el arranque offline
      });
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}
