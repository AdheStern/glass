import { expect, test } from "@playwright/test";

// Recorrido 4 de §23.1 ("Reponer"): escanear un código inexistente → crear el
// producto ahí mismo → ingresar 12 unidades → verificar que aparece en el
// catálogo con la existencia correcta.
//
// El panel está detrás de sesión de Supabase. Sin claves configuradas,
// `/panel/*` redirige a `/entrar` y la prueba se salta (misma limitación que
// la bandeja de pedidos en Fase 3).

test("reponer: alta por escaneo e ingreso de 12 unidades", async ({ page }) => {
  await page.goto("/panel/inventario/ingreso");
  if (new URL(page.url()).pathname.startsWith("/entrar")) {
    test.skip(
      true,
      "El panel necesita una sesión de Supabase para esta prueba.",
    );
    return;
  }

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
