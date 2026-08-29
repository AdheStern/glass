import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./helpers";

// Subida de imágenes de producto (§12.1): el navegador recorta y sube directo a
// Supabase Storage con una URL firmada; el servidor solo registra la fila. En el
// primer uso `ensureBucket` crea el bucket. Requiere las credenciales de Storage
// en el entorno; si no están, el test salta.

const FIXTURE = path.join(__dirname, "fixtures", "foto-prueba.png");

test("subir una foto a un producto y verla adjunta", async ({ page }) => {
  test.setTimeout(120_000);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    test.skip(
      true,
      "Sin SUPABASE_SERVICE_ROLE_KEY: no se puede subir a Storage.",
    );
  }
  await loginAsOwner(page);

  await page.goto("/panel/productos");
  const href = await page
    .locator('tbody a[href^="/panel/productos/"]')
    .first()
    .getAttribute("href");
  await page.goto(href ?? "/panel/productos");
  await expect(page.getByRole("button", { name: "Agregar" })).toBeVisible({
    timeout: 30_000,
  });

  const before = await page.locator("img").count();
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  await expect(page.getByText("Fotos subidas")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("img")).toHaveCount(before + 1);
});
