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
| ~~T-04~~ | **CSP** (§21) — **hecha (pragmática)** | `next.config.ts` emite una `Content-Security-Policy` global. Sin `nonce` (incompatible con el cacheo de `cacheComponents`): `script-src`/`style-src` llevan `'unsafe-inline'` — aceptable porque el contenido de usuario nunca se inyecta como HTML (texto enriquecido = AST saneado, §11.1). `script-src` incluye `'wasm-unsafe-eval'` (argon2id del PIN sin conexión). Bloquea scripts/estilos externos, plugins, clickjacking, `<base>` y secuestro de formularios. Una CSP con `nonce`/`strict-dynamic` sigue pendiente y exige renunciar al cacheo de respuestas. |
| T-05 | **Verificación de correo / SMTP** | Better Auth corre con `requireEmailVerification: false`. Falta cablear el envío (Mailpit en dev, SMTP real en prod) y activar la verificación para altas de equipo. |
| T-06 | **Proveedor Google (OAuth)** | Pospuesto por decisión: sólo correo/contraseña. Better Auth ya soporta añadirlo; falta la credencial de DIMA con URI de retorno por dominio (§4.3 menciona `GOOGLE_CLIENT_ID`). |

## Accesibilidad

| # | Deuda | Detalle |
|---|---|---|
| ~~T-07~~ | **`<Label>` sin `htmlFor`/`id`** — **resuelto** | Nuevo `src/components/field.tsx` (`Field`, con `useId`) y los helpers de `block-form.tsx` cablean `htmlFor`/`id`. Los tests vuelven a usar `getByLabel`. |

## Comportamiento de Next 16

| # | Deuda | Detalle |
|---|---|---|
| T-08 | **Rutas dinámicas devuelven 200 en vez de 404** | Confirmado en el servidor `standalone` de producción: `/pedido/<folio-inexistente>`, `/producto/<slug-inexistente>`, `/<pagina-inexistente>`, `/borrador/<token-falso>` responden **200** con la página de "no encontrado" en el cuerpo. Todas esas rutas son PPR (`◐`): el shell estático del `(shop)/layout.tsx` se transmite con 200 antes de que el `notFound()` de la página (que sí corre `await connection()` + `instant = false`) llegue. **Probado sin éxito**: llamar `notFound()` desde `generateMetadata` — el shell PPR ya salió con 200 igual. Arreglarlo "de verdad" exige o volver dinámico el layout de la tienda —y perder el prerender del shell del catálogo (§7.1, no negociable)— o un pre-chequeo de existencia en `proxy.ts` (consulta a BD por request en el middleware, p. ej. contra un set de slugs cacheado). `/pedido` y `/borrador` llevan `robots: noindex`, así que el impacto SEO real es sobre `/producto/[slug]` y `/[pagina]` (soft-404). Pendiente de decisión. |

## Funcionalidad diferida

| # | Deuda | Detalle |
|---|---|---|
| T-09 | **DA-07 — quitar fondo de fotos en el navegador** (§28) | "Fase 8 según tiempo": no se implementó. Mejora mucho el aspecto del catálogo pero suma ~5 MB de modelo al cargar productos. |
| T-10 | **Importador de imágenes en la siembra** | Sin `SUPABASE_SERVICE_ROLE_KEY`, `pnpm db:seed` omite subir las fotos del pool y los productos quedan con su gradiente. Con las credenciales puestas ya sube; falta revisar el rendimiento con 2000 productos. |
