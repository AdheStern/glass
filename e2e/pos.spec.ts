import { expect, type Page, test } from "@playwright/test";

// Recorridos 2 y 5 de §23.1. El POS usa token de dispositivo + PIN: no necesita
// Supabase. Datos de siembra: código de emparejamiento 424242, PIN 2468,
// producto con código de barras 7501000000001 (Bs 125,00), redondeo al 0,10.

// En serie: comparten el correlativo de folio y el código de emparejamiento.
// Cada acción del POS cruza a Supabase varias veces; se dan tiempos holgados.
test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

const T = { timeout: 45_000 };

const PAIRING_CODE = "424242";
const PIN = "2468";
const BARCODE = "7501000000001";

async function tapPin(page: Page, pin: string) {
  for (const d of pin) {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
}

async function pairAndOpen(page: Page, openingBs: string) {
  await page.goto("/pos");
  await page.getByLabel("Código de emparejamiento").fill(PAIRING_CODE);
  await page.getByLabel("Nombre de la caja").fill(`Caja e2e ${Date.now()}`);
  await page.getByRole("button", { name: "Emparejar" }).click();

  await expect(page.getByRole("heading", { name: "Abrir turno" })).toBeVisible(
    T,
  );
  await page
    .getByRole("button", { name: /María|José|Rosa/ })
    .first()
    .click();
  await page.getByLabel("Fondo de apertura (Bs)").fill(openingBs);
  await page.getByRole("button", { name: "Continuar" }).click();
  await tapPin(page, PIN);

  await expect(page.getByRole("button", { name: "Cobrar" })).toBeVisible(T);
}

test("recorrido 2 — vender en caja con descuento autorizado y vuelto", async ({
  page,
}) => {
  await pairAndOpen(page, "100");

  const scan = page.getByPlaceholder(/Escaneá/i).first();
  await scan.fill(BARCODE);
  await scan.press("Enter");

  // La línea entra al ticket.
  await expect(page.getByText("TOTAL")).toBeVisible(T);

  // Descuento de caja del 10 % → pide PIN de rol superior.
  await page.getByPlaceholder("% desc. línea").fill("10");

  await page.getByRole("button", { name: "Cobrar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Monto recibido (Bs)").fill("150");
  // Vuelto: 150 − 112,50 (125 − 10 %, redondeo al 0,10) = 37,50.
  await expect(page.getByText("Bs 37,50")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cobro" }).click();

  // Autorización del jefe.
  await expect(page.getByText(/PIN de un rol superior/i)).toBeVisible(T);
  await tapPin(page, PIN);

  // Cobrada: el diálogo cierra y el botón Cobrar queda deshabilitado (ticket vacío).
  await expect(page.getByRole("dialog")).toBeHidden(T);
  await expect(page.getByRole("button", { name: "Cobrar" })).toBeDisabled(T);
});

test("recorrido 5 — cerrar caja: conteo declarado, esperado y diferencia", async ({
  page,
}) => {
  await pairAndOpen(page, "0");

  const scan = page.getByPlaceholder(/Escaneá/i).first();
  await scan.fill(BARCODE);
  await scan.press("Enter");
  await expect(page.getByText("TOTAL")).toBeVisible(T);

  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.getByLabel("Monto recibido (Bs)").fill("125");
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(page.getByRole("dialog")).toBeHidden(T);
  await expect(page.getByRole("button", { name: "Cobrar" })).toBeDisabled(T);

  await page.getByRole("link", { name: "Cerrar turno" }).click();
  await expect(page).toHaveURL(/\/pos\/turno\/cerrar/);

  // Se declara el conteo antes de ver lo esperado (§16.2).
  await page.getByLabel("Efectivo contado (Bs)").fill("125");
  await page.getByRole("button", { name: "Cerrar turno" }).click();

  // Cierra (diferencia 0) y muestra el arqueo inmutable.
  await expect(page).toHaveURL(/\/pos\/arqueo\//, T);
  await expect(page.getByText("Esperado en cajón")).toBeVisible(T);
  await expect(page.getByText("Diferencia")).toBeVisible();
});
