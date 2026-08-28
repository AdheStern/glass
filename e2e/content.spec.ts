import { expect, test } from "@playwright/test";

// Fase 7 — render público del CMS (§11). No necesita Supabase: se prueba contra
// el contenido sembrado (portada por bloques, página "nosotros", 2 entradas
// publicadas + 1 borrador con testigo fijo).

const DRAFT_TOKEN = "demo-borrador-0000000000000000";

test("la portada se arma con bloques", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Todo para tu obra y tu casa" }),
  ).toBeVisible();
  await expect(page.getByText("Lo más pedido")).toBeVisible();
  await expect(page.getByText("¿Hacen envíos?")).toBeVisible();
});

test("el bloque FAQ emite FAQPage en JSON-LD", async ({ page }) => {
  await page.goto("/");
  const blobs = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(blobs.some((b) => b.includes('"FAQPage"'))).toBe(true);
});

test("una página del CMS renderiza por slug", async ({ page }) => {
  const res = await page.goto("/nosotros");
  expect(res?.status()).toBe(200);
  await expect(page.getByText(/negocio familiar/i)).toBeVisible();
});

test("el blog lista las publicadas y no el borrador", async ({ page }) => {
  await page.goto("/blog");
  await expect(
    page.getByRole("link", { name: "Cómo elegir la broca correcta" }),
  ).toBeVisible();
  await expect(
    page.getByText("Una entrada que todavía no publicamos"),
  ).toHaveCount(0);
});

test("una entrada del blog renderiza con Article JSON-LD", async ({ page }) => {
  await page.goto("/blog/como-elegir-brocas");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Cómo elegir la broca correcta",
  );
  const blobs = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(blobs.some((b) => b.includes('"Article"'))).toBe(true);
});

test("el RSS trae las entradas publicadas", async ({ request }) => {
  const res = await request.get("/blog/feed.xml");
  expect(res.ok()).toBeTruthy();
  expect(res.headers()["content-type"]).toContain("xml");
  const xml = await res.text();
  expect(xml).toContain("Cómo elegir la broca correcta");
  expect(xml).toContain("Novedades del taller");
  expect(xml).not.toContain("Una entrada que todavía no publicamos");
});

test("el borrador se ve por testigo y lleva noindex", async ({ page }) => {
  await page.goto(`/borrador/${DRAFT_TOKEN}`);
  await expect(page.getByText("Vista previa de un borrador")).toBeVisible();
  await expect(
    page.getByText("Este texto solo se ve con el enlace de borrador."),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("una página inexistente no rompe", async ({ page }) => {
  // Nota: Next 16 puede transmitir 200 antes de resolver notFound() (igual que
  // /pedido); se asienta sobre el contenido de "no encontrado".
  await page.goto("/pagina-que-no-existe-jamas");
  await expect(
    page.getByText(/no encontr|no existe|404/i).first(),
  ).toBeVisible();
});
