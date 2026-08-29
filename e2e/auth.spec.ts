import { expect, test } from "@playwright/test";
import { loginAsOwner, OWNER_EMAIL } from "./helpers";

// Auth del panel con Better Auth (ADR-04). El propietario se siembra desde
// OWNER_EMAIL; el registro público está cerrado.

test("sin sesión, /panel redirige a /entrar", async ({ page }) => {
  await page.goto("/panel/productos");
  await expect(page).toHaveURL(/\/entrar/);
});

test("el propietario entra y ve el ABM de usuarios", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/panel/usuarios");
  await expect(
    page.getByRole("heading", { name: "Usuarios del panel" }),
  ).toBeVisible();
  await expect(page.getByText(`${OWNER_EMAIL} · vos`)).toBeVisible();
});

test("cerrar sesión vuelve a /entrar y corta el acceso", async ({ page }) => {
  await loginAsOwner(page);
  // En móvil la barra lateral está colapsada; se abre con el trigger.
  const salir = page.getByRole("button", { name: "Salir" });
  if (!(await salir.isVisible())) {
    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  }
  await salir.click();
  await page.waitForURL(/\/entrar/, { timeout: 30_000 });
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/entrar/);
});
