/* Glass — service worker del catálogo (§22.8). SOLO caché de recursos estáticos:
 * "Sin funcionamiento sin conexión". No intercepta navegaciones ni /api/*; si no
 * hay red, el navegador muestra su propio error. Los assets de Next
 * (/_next/static/) y las imágenes se sirven stale-while-revalidate para que la
 * segunda visita sea instantánea. */
const CACHE = "glass-catalogo-v1";

self.addEventListener("install", () => self.skipWaiting());

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

  const isStatic = url.pathname.startsWith("/_next/static/");
  const isImage = request.destination === "image";
  if (!isStatic && !isImage) return; // navegaciones y API: red directa

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((hit) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || network;
      }),
    ),
  );
});
