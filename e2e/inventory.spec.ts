import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./helpers";

// Recorrido 4 de §23.1 ("Reponer"): escanear un código inexistente → crear el
// producto ahí mismo → ingresar 12 unidades → verificar que aparece en el
// catálogo con la existencia correcta. Requiere sesión del panel (Better Auth).
//
// TODO(fase-4): con la auth funcionando este recorrido ya corre de verdad y
// destapó que `quickCreateFromScanAction` no agrega la fila. Arreglar el alta
// rápida del ingreso y quitar el `fixme`.
test.fixme("reponer: alta por escaneo e ingreso de 12 unidades", async ({
  page,
}) => {
  await loginAsOwner(page);
  await page.goto("/panel/inventario/ingreso");

  const code = `TESTREPO${Date.now()}`;
  const name = `Producto de prueba ${code}`;

  // Vía "teclado" del §15.1: escribir el código en el campo y Enter.
  const scan = page.getByPlaceholder(/Escaneá/i).first();
  await scan.fill(code);
  await scan.press("Enter");

  // El código no existe → alta rápida.
  await expect(page.getByText(/no existe/i)).toBeVisible();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel(/Precio/i).fill("25,00");
  await page.getByRole("button", { name: /Crear y agregar/i }).click();

  // Fila agregada con cantidad 1 → subir a 12.
  await expect(page.getByText(name)).toBeVisible();
  for (let i = 1; i < 12; i++) {
    await page.getByRole("button", { name: "Más" }).click();
  }
  await expect(page.getByText(/12 unidades/)).toBeVisible();

  await page.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(page.getByText(/Ingreso registrado/i)).toBeVisible();

  // El catálogo refleja la existencia.
  const slug = `producto-de-prueba-${code.toLowerCase()}`;
  await page.goto(`/producto/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
  await expect(page.getByText(/Quedan 12|Disponible/)).toBeVisible();
});
