/* Glass — service worker de la caja (§22.8). App-shell cache-first para navegar
 * a /pos sin red; stale-while-revalidate para los assets de Next. Nunca cachea
 * /api/* (la sincronización tiene que ir a la red o fallar de verdad). */
const CACHE = "glass-pos-v1";
const SHELL = ["/pos", "/pos/turno/cerrar"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        Promise.all(
          SHELL.map((u) =>
            fetch(u, { cache: "reload" })
              .then((res) => (res.ok ? c.put(u, res) : undefined))
              .catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navegaciones a la caja: cache-first, con red como respaldo.
  if (request.mode === "navigate" && url.pathname.startsWith("/pos")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request)
            .then((res) => {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
              return res;
            })
            .catch(() => caches.match("/pos")),
      ),
    );
    return;
  }

  // Assets de Next: stale-while-revalidate.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(request).then((hit) => {
          const net = fetch(request)
            .then((res) => {
              c.put(request, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
  }
});
