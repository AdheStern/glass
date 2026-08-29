import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./helpers";

// Fase 7 — editor de bloques en el panel (§11). Requiere sesión del panel
// (Better Auth); si no hay propietario sembrado, `loginAsOwner` salta.

test("editor: agregar un bloque y publicar la página", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsOwner(page);
  await page.goto("/panel/paginas/nueva");
  await expect(
    page.getByRole("heading", { name: "Nueva página" }),
  ).toBeVisible();

  // El primer campo de texto del formulario es el título.
  await page.getByRole("textbox").first().fill(`Página e2e ${Date.now()}`);
  await page.getByRole("button", { name: "Agregar bloque" }).click();
  await page.getByRole("menuitem", { name: "Portada" }).click();
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Página publicada")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Despublicar" })).toBeVisible();
});
