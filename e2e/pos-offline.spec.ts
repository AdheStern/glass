import { expect, type Page, test } from "@playwright/test";

// Recorrido 3 de §23.1 (CANON-02) — el que decide si el modo sin conexión sirve.
// Abre turno con red, corta la red, vende seis veces, mata el proceso a mitad de
// un séptimo cobro, reabre, comprueba que la venta a medias no existe y las seis
// sí, reconecta, sincroniza y verifica que el servidor tiene exactamente seis
// ventas y seis movimientos VENTA, sin duplicados.

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const T = { timeout: 60_000 };
const PAIRING_CODE = "424242";
const PIN = "2468";
const BARCODE = "7501000000001";

async function tapPin(page: Page, pin: string) {
  for (const d of pin) {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
}

async function pairAndOpen(page: Page) {
  await page.goto("/pos");
  await page.getByLabel("Código de emparejamiento").fill(PAIRING_CODE);
  await page.getByLabel("Nombre de la caja").fill(`Caja offline ${Date.now()}`);
  await page.getByRole("button", { name: "Emparejar" }).click();

  await expect(page.getByRole("heading", { name: "Abrir turno" })).toBeVisible(
    T,
  );
  await page
    .getByRole("button", { name: /María|José|Rosa/ })
    .first()
    .click();
  await page.getByLabel("Fondo de apertura (Bs)").fill("0");
  await page.getByRole("button", { name: "Continuar" }).click();
  await tapPin(page, PIN);

  // Espera a que el paquete esté en Dexie (bootstrap lo descarga con red).
  await expect(page.getByRole("button", { name: "Cobrar" })).toBeVisible(T);
  await expect
    .poll(() => queuedCount(page), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(0);

  // El service worker tiene que tomar control para reabrir la caja sin red.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            "serviceWorker" in navigator &&
            !!navigator.serviceWorker.controller,
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
}

async function sellCash(page: Page) {
  const scan = page.getByPlaceholder(/Escaneá/i).first();
  await scan.fill(BARCODE);
  await scan.press("Enter");
  await expect(page.getByText("TOTAL")).toBeVisible(T);

  await page.getByRole("button", { name: "Cobrar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible(T);
  await page.getByLabel("Monto recibido (Bs)").fill("200");
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(page.getByRole("dialog")).toBeHidden(T);
  await expect(page.getByRole("button", { name: "Cobrar" })).toBeDisabled(T);
}

/** Comandos SALE sin sincronizar en IndexedDB. -1 si la base no abre. */
function queuedCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open("glass-pos");
        req.onerror = () => resolve(-1);
        req.onsuccess = () => {
          const db = req.result;
          try {
            const store = db
              .transaction("queue", "readonly")
              .objectStore("queue");
            const all = store.getAll();
            all.onsuccess = () => {
              const rows = all.result as { synced: number }[];
              resolve(rows.filter((r) => r.synced === 0).length);
              db.close();
            };
            all.onerror = () => resolve(-1);
          } catch {
            resolve(-1);
          }
        };
      }),
  );
}

function deviceId(page: Page): Promise<string> {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("glass.pos.device") ?? "{}")
        .deviceId as string;
    } catch {
      return "";
    }
  });
}

test("recorrido 3 — vender sin conexión, muerte a mitad de un cobro, sincronizar", async ({
  page,
}) => {
  await pairAndOpen(page);
  const id = await deviceId(page);
  expect(id).toBeTruthy();

  // Cae internet.
  await page.context().setOffline(true);
  await expect(page.getByText(/Sin conexión/i)).toBeVisible(T);

  // Seis ventas cobradas sin red.
  for (let i = 0; i < 6; i++) await sellCash(page);
  await expect.poll(() => queuedCount(page), T).toBe(6);
  await expect(page.getByText(/6 ventas por enviar/i)).toBeVisible(T);

  // Séptimo cobro: el proceso muere a mitad de la transacción local.
  const scan = page.getByPlaceholder(/Escaneá/i).first();
  await scan.fill(BARCODE);
  await scan.press("Enter");
  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.getByLabel("Monto recibido (Bs)").fill("200");
  await page.evaluate(() => {
    (window as { __glassCrashNextSale?: boolean }).__glassCrashNextSale = true;
  });
  await page.getByRole("button", { name: "Confirmar cobro" }).click();

  // La venta a medias no existe: la cola sigue en seis.
  await expect.poll(() => queuedCount(page), T).toBe(6);

  // Reabrir la caja sin red (SW + Dexie).
  await page.reload();
  await expect(page.getByRole("button", { name: "Cobrar" })).toBeVisible(T);
  await expect.poll(() => queuedCount(page), T).toBe(6);

  // Vuelve internet y sincroniza en segundo plano.
  await page.context().setOffline(false);
  await expect.poll(() => queuedCount(page), { timeout: 120_000 }).toBe(0);

  // El servidor tiene exactamente seis ventas, seis movimientos, sin duplicados.
  const inspect = await page.request.get(
    `/api/sync/inspect?deviceId=${encodeURIComponent(id)}`,
  );
  expect(inspect.ok()).toBeTruthy();
  const data = await inspect.json();
  expect(data.saleCount).toBe(6);
  expect(data.uniqueClientSaleIds).toBe(6);
  expect(data.ventaMovements).toBe(6);

  // Cerrar el turno: el arqueo cuenta las seis.
  await page.getByRole("link", { name: "Cerrar turno" }).click();
  await expect(page).toHaveURL(/\/pos\/turno\/cerrar/, T);
  await page.getByLabel("Efectivo contado (Bs)").fill("750");
  await expect(page.getByRole("button", { name: "Cerrar turno" })).toBeEnabled(
    T,
  );
  await page.getByRole("button", { name: "Cerrar turno" }).click();
  await expect(page).toHaveURL(/\/pos\/arqueo\//, T);
  await expect(page.getByText(/6 ventas/)).toBeVisible(T);
});
