import { expect, type Page, test } from "@playwright/test";

export const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "";
export const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "glass-cambiar";

/**
 * Loguea como propietario (sembrado por `pnpm db:seed`). Si no hay credenciales
 * o la BD no tiene propietario, salta el test — misma política que antes con
 * Supabase.
 */
export async function loginAsOwner(page: Page) {
  if (!OWNER_EMAIL) {
    test.skip(true, "Sin OWNER_EMAIL: no se puede loguear en el panel.");
  }
  await page.goto("/entrar");
  if (await page.getByText("Todavía no hay propietario").isVisible()) {
    test.skip(true, "La BD no tiene propietario. Corré `pnpm db:seed`.");
  }
  await page.getByLabel("Correo").fill(OWNER_EMAIL);
  await page.getByLabel("Contraseña").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/panel/, { timeout: 30_000 });
}
