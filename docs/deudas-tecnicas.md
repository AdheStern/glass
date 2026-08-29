# Deudas técnicas y pendientes

Lo que quedó fuera del alcance de las fases 0–8 y por qué. Las **decisiones
abiertas de producto y comerciales** (impresión térmica, nombre del paquete,
multi-sucursal, precio, etc.) están en el **§28 del plan maestro** (`DA-01`…`DA-07`)
y no se repiten acá. Esto es solo lo de implementación.

Ninguno de estos ítems impide el funcionamiento del sistema entregado.

## Verificación y CI

| # | Deuda | Detalle |
|---|---|---|
| T-01 | **Presupuesto de rendimiento sin verificar en CI** (§20) | `pnpm perf` (Lighthouse CI) necesita Chrome/Edge, que no está en el entorno de desarrollo actual. El límite de <120 KB de JS del catálogo no se comprueba automáticamente. Se verifica a ojo con el bundle de `pnpm build`. |
| T-02 | **Prueba visual de los 8 presets** (§23) | `e2e/appearance.spec.ts` valida que cada preset renderiza y emite sus tokens, pero no compara capturas (`toHaveScreenshot`). Falta generar y versionar los baselines para detectar regresiones visuales finas. |
| T-03 | **GitHub Actions + despliegue** (§4.4) | No hay pipeline que construya y publique la imagen de producción ni el flujo de despliegue por tandas en Coolify. El repo remoto (`AdheStern/glass`) existe pero sin Actions. |

## Endurecimiento

| # | Deuda | Detalle |
|---|---|---|
| T-04 | **CSP completa** (§21) | `next.config.ts` pone solo cabeceras básicas (`nosniff`, HSTS, `Referrer-Policy`, `X-Frame-Options`). Una `Content-Security-Policy` estricta rompería el `<style>` de tokens del layout y el iframe de la vista previa del editor; hay que redactarla con `nonce`/`strict-dynamic` y probarla contra esas dos superficies. |
| T-05 | **Verificación de correo / SMTP** | Better Auth corre con `requireEmailVerification: false`. Falta cablear el envío (Mailpit en dev, SMTP real en prod) y activar la verificación para altas de equipo. |
| T-06 | **Proveedor Google (OAuth)** | Pospuesto por decisión: sólo correo/contraseña. Better Auth ya soporta añadirlo; falta la credencial de DIMA con URI de retorno por dominio (§4.3 menciona `GOOGLE_CLIENT_ID`). |

## Accesibilidad

| # | Deuda | Detalle |
|---|---|---|
| T-07 | **`<Label>` sin `htmlFor`/`id`** | En el editor de contenido (`page-editor.tsx`, `post-editor.tsx`, `block-form.tsx`) los `<Label>` no están asociados a su input. Funciona, pero un lector de pantalla no anuncia el campo y los tests e2e tienen que usar `getByRole("textbox")` en vez de `getByLabel`. |

## Comportamiento de Next 16

| # | Deuda | Detalle |
|---|---|---|
| T-08 | **Rutas dinámicas que transmiten 200 antes de `notFound()`** | `/pedido/[folio]`, `/pos/comprobante/[folio]`, `/[pagina]`, `/borrador/[token]` pueden empezar a transmitir la respuesta con 200 antes de que se resuelva el `notFound()` para un recurso inexistente. Es un efecto del streaming de Cache Components; el usuario ve la página de "no encontrado" igual, pero el status HTTP no es 404. |

## Funcionalidad diferida

| # | Deuda | Detalle |
|---|---|---|
| T-09 | **DA-07 — quitar fondo de fotos en el navegador** (§28) | "Fase 8 según tiempo": no se implementó. Mejora mucho el aspecto del catálogo pero suma ~5 MB de modelo al cargar productos. |
| T-10 | **Importador de imágenes en la siembra** | Sin `SUPABASE_SERVICE_ROLE_KEY`, `pnpm db:seed` omite subir las fotos del pool y los productos quedan con su gradiente. Con las credenciales puestas ya sube; falta revisar el rendimiento con 2000 productos. |
