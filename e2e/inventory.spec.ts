import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./helpers";

// Recorrido 4 de §23.1 ("Reponer"): escanear un código inexistente → crear el
// producto ahí mismo → ingresar 12 unidades → verificar que aparece en el
// catálogo con la existencia correcta. Requiere sesión del panel (Better Auth).
test("reponer: alta por escaneo e ingreso de 12 unidades", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsOwner(page);
  await page.goto("/panel/inventario/ingreso");

  const code = `TESTREPO${Date.now()}`;
  const name = `Producto de prueba ${code}`;

  // Vía "teclado" del §15.1: escribir el código en el campo y Enter.
  const scan = page.getByPlaceholder(/Escaneá/i).first();
  await scan.fill(code);
  await scan.press("Enter");

  // El código no existe → alta rápida.
  await expect(page.getByText(/no existe/i)).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel(/Precio/i).fill("25,00");
  await page.getByRole("button", { name: /Crear y agregar/i }).click();

  // Fila agregada con cantidad 1 → subir a 12. (El alta toca la BD remota:
  // puede tardar unos segundos.) `exact` para no chocar con el toast, que
  // envuelve el nombre entre comillas.
  await expect(page.getByText(name, { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  for (let i = 1; i < 12; i++) {
    await page.getByRole("button", { name: "Más" }).click();
  }
  await expect(page.getByText(/12 unidades/)).toBeVisible();

  await page.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(page.getByText(/Ingreso registrado/i)).toBeVisible({
    timeout: 20_000,
  });

  // El catálogo refleja la existencia.
  const slug = `producto-de-prueba-${code.toLowerCase()}`;
  await page.goto(`/producto/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
  await expect(page.getByText(/Quedan 12|Disponible|En stock/i)).toBeVisible({
    timeout: 15_000,
  });
});
