import { expect, test } from "@playwright/test";

// PWA del catálogo (§22.8): instalable, solo caché de assets, sin modo sin conexión.

test("el manifiesto del catálogo es válido", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const m = await res.json();
  expect(m.name).toBeTruthy();
  expect(m.start_url).toBe("/");
  expect(m.display).toBe("minimal-ui");
  expect(m.icons.length).toBeGreaterThan(0);
});

test("el service worker se sirve sin caché", async ({ request }) => {
  const res = await request.get("/catalogo-sw.js");
  expect(res.ok()).toBeTruthy();
  expect(res.headers()["cache-control"]).toContain("no-cache");
});

test("el catálogo enlaza el manifiesto y trae las cabeceras de seguridad", async ({
  page,
}) => {
  const res = await page.goto("/catalogo");
  expect(res?.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});
