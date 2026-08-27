import { expect, test } from "@playwright/test";

// Humo de Fase 0. Los 6 recorridos del §23.1 llegan en fases posteriores.

test("la portada carga", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("el catálogo carga", async ({ page }) => {
  const response = await page.goto("/catalogo");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
});

test("el healthcheck responde", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.ok).toBe(true);
});
