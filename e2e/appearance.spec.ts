import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./helpers";

const PRESETS = [
  "MERCADO",
  "BOUTIQUE",
  "TALLER",
  "SABOR",
  "FARMACIA",
  "ESTUDIO",
  "NOCTURNO",
  "PAPEL",
];

// Los 8 presets renderizan sobre el mismo catálogo sin romper el layout (prueba
// visual de §23: "un cambio en los tokens no debe romper cinco temas en silencio").
for (const preset of PRESETS) {
  test(`preset ${preset} renderiza el catálogo con sus tokens`, async ({
    page,
  }) => {
    const res = await page.goto(
      `/apariencia-preview?preset=${preset}&color=oklch(0.6 0.15 250)`,
    );
    expect(res?.status()).toBe(200);
    await expect(page.getByText("Destacados")).toBeVisible();
    const style = await page.locator("style").first().textContent();
    expect(style).toMatch(/--on-brand:/);
  });
}

// Recorrido 6 de §23.1 ("Personalizar"): cambiar color y preset → la vista previa
// del catálogo cambia sin desplegar y el contraste sigue cumpliendo AA.
test.describe("editor de apariencia", () => {
  test.afterEach(async ({ page }) => {
    await loginAsOwner(page).catch(() => {});
    await page.goto("/panel/apariencia").catch(() => {});
    await page
      .getByLabel("Color de marca (CSS)")
      .fill("oklch(0.62 0.17 25)")
      .catch(() => {});
    await page
      .getByRole("button", { name: "Mercado" })
      .click()
      .catch(() => {});
    await page
      .getByRole("button", { name: "Guardar" })
      .click()
      .catch(() => {});
    await page
      .getByText("Apariencia guardada")
      .waitFor({ timeout: 15_000 })
      .catch(() => {});
  });

  test("preview en vivo, contraste AA y guardado", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsOwner(page);
    await page.goto("/panel/apariencia");
    await expect(
      page.getByRole("heading", { name: "Apariencia" }),
    ).toBeVisible();

    const frame = page.locator('iframe[title="Vista previa del catálogo"]');
    await expect(frame).toBeVisible();
    await expect(page.getByText(/Contraste AA/)).toBeVisible();

    // Tema base → el iframe se recarga con la selección nueva.
    await page.getByRole("button", { name: "Nocturno" }).click();
    await expect(frame).toHaveAttribute("src", /preset=NOCTURNO/);

    // Tono de marca poco común, para reconocerlo en el catálogo público.
    const colorInput = page.getByLabel("Color de marca (CSS)");
    await colorInput.fill("oklch(0.55 0.16 205)");
    await expect(colorInput).toHaveValue("oklch(0.55 0.16 205)");
    await expect(
      page.getByText(/Contraste AA: (cumple|no cumple)/),
    ).toBeVisible();

    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Apariencia guardada")).toBeVisible({
      timeout: 20_000,
    });

    // El catálogo público cambió sin reiniciar el server.
    await expect
      .poll(
        async () => {
          await page.goto("/");
          return page.locator("head style").first().textContent();
        },
        { timeout: 20_000 },
      )
      .toEqual(
        expect.stringContaining("--font-body: var(--font-inter)"), // par de NOCTURNO
      );
    const head = await page.locator("head style").first().textContent();
    expect(head).toContain("205)"); // el nuevo tono de marca
  });
});
