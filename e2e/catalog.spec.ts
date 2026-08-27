import { expect, test } from "@playwright/test";

// Parte del recorrido 1 de §23.1 (sin carrito, que es Fase 3):
// entrar al catálogo → filtrar por categoría → abrir un producto → ver precio y
// disponibilidad.

test("recorrido: catálogo → categoría → ficha con precio y disponibilidad", async ({
  page,
}) => {
  await page.goto("/catalogo");
  await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();

  // Filtrar por una categoría
  await page.getByRole("link", { name: "Herramientas" }).first().click();
  await expect(page).toHaveURL(/\/catalogo\/herramientas/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Herramientas",
  );

  // Abrir la primera ficha de producto visible
  const firstCard = page.locator('a[href^="/producto/"]:visible').first();
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.click();
  await expect(page).toHaveURL(/\/producto\//);

  // Precio y disponibilidad presentes
  await expect(page.getByText(/Bs\s[\d.,]+/).first()).toBeVisible();
  await expect(
    page.getByText(/Disponible|Agotado|Últimas unidades|Quedan \d+/).first(),
  ).toBeVisible();
});

test("búsqueda tolera errores de tipeo", async ({ page }) => {
  await page.goto("/buscar?q=destornilador");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "destornilador",
  );
  await expect(page.locator('a[href^="/producto/"]').first()).toBeVisible();
});

test("filtro «en oferta» deja solo productos con descuento", async ({
  page,
}) => {
  await page.goto("/catalogo?oferta=1");
  const strike = page.locator(".line-through").first();
  await expect(strike).toBeVisible();
});

test("sitemap y robots responden", async ({ request }) => {
  expect((await request.get("/sitemap.xml")).ok()).toBeTruthy();
  expect((await request.get("/robots.txt")).ok()).toBeTruthy();
});
