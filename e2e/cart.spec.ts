import { expect, test } from "@playwright/test";

// Recorrido 1 de §23.1: catálogo → producto → agregar → carrito → crear pedido
// → verificar folio y total. (El envío por WhatsApp es un enlace externo.)

test("comprar: agregar al carrito y crear el pedido", async ({
  page,
  context,
}) => {
  await page.goto("/producto/juego-destornilladores-stanley-12");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const addBtn = page.getByRole("button", { name: /Agregar al pedido/i });
  await addBtn.click();
  await addBtn.click(); // 2 unidades

  await page.goto("/carrito");
  await expect(
    page
      .getByRole("main")
      .getByText("Juego de destornilladores Stanley 12 piezas"),
  ).toBeVisible();
  // La cantidad de la línea (el "2" del contador del encabezado también existe).
  await expect(
    page.getByRole("main").getByText("2", { exact: true }),
  ).toBeVisible();

  // Evitar que la pestaña de WhatsApp bloquee el test
  await context.route("https://wa.me/**", (r) => r.abort());

  await page.getByRole("button", { name: "Pedir por WhatsApp" }).click();

  await expect(page.getByText(/Pedido P-\d+ creado/)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("link", { name: "Ver pedido" })).toBeVisible();
});

test("un pedido inexistente muestra el aviso de no encontrado", async ({
  page,
}) => {
  // Next 16 con Cache Components transmite el shell antes de resolver el
  // `notFound()`, así que el código sigue siendo 200; la UI de "no encontrado"
  // sí se renderiza y la página lleva `noindex`.
  await page.goto("/pedido/P-999999");
  await expect(page.getByText(/No encontramos esa página/i)).toBeVisible();
});
