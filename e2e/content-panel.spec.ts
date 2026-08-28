import { expect, test } from "@playwright/test";

// Fase 7 — editor de bloques en el panel (§11). El panel está detrás de sesión
// de Supabase; sin claves configuradas la prueba se salta (misma limitación que
// inventario y la bandeja de pedidos).

test("editor: agregar bloques, publicar y ver en la portada", async ({
  page,
}) => {
  await page.goto("/panel/paginas/nueva");
  if (new URL(page.url()).pathname.startsWith("/entrar")) {
    test.skip(true, "El panel necesita una sesión de Supabase.");
    return;
  }

  await page.getByLabel("Título").first().fill("Página de prueba e2e");
  await page.getByRole("button", { name: "Agregar bloque" }).click();
  await page.getByRole("menuitem", { name: "Portada" }).click();
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("publicada", { exact: false })).toBeVisible();
});
