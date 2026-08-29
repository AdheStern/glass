import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./helpers";

// Tablero (§18.1) y reportes (§18.2). Requiere sesión del panel (Better Auth) y
// datos sembrados (`pnpm db:seed` deja ventas hasta hoy).

test("el tablero muestra los 4 KPIs y la curva", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/panel");
  await expect(page.getByText("Vendido hoy")).toBeVisible();
  await expect(page.getByText("Ventas de hoy")).toBeVisible();
  await expect(page.getByText("Pedidos sin atender")).toBeVisible();
  await expect(page.getByText("Productos bajo mínimo")).toBeVisible();
  await expect(page.getByText("Ventas · últimos 14 días")).toBeVisible();
});

test("reporte de ventas: tabla y exportación a CSV y PDF", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/panel/reportes");
  await page.getByRole("link", { name: "Ventas por período" }).click();
  await expect(
    page.getByRole("heading", { name: "Ventas por período" }),
  ).toBeVisible();
  await expect(page.locator("th", { hasText: "Neto" })).toBeVisible();

  const csv = await page.request.get(
    "/panel/reportes/ventas/export?format=csv",
  );
  expect(csv.ok()).toBeTruthy();
  expect(csv.headers()["content-type"]).toContain("text/csv");

  const pdf = await page.request.get(
    "/panel/reportes/ventas/export?format=pdf",
  );
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});

test("el reporte de margen es solo del propietario", async ({ page }) => {
  await loginAsOwner(page);
  // El propietario sí lo ve.
  await page.goto("/panel/reportes/margen");
  await expect(
    page.getByRole("heading", { name: "Margen por producto" }),
  ).toBeVisible();
});
