@AGENTS.md

# Glass — contexto permanente para Claude Code

## Qué es esto

Catálogo en línea + punto de venta + inventario para comercios pequeños en Bolivia.
Se vende empaquetado: una instancia por cliente. El plan maestro está en
`docs/plan-maestro.html` y manda sobre cualquier otra cosa.

El producto se llama **Glass**. El plan maestro usa el nombre interno anterior "Vitrina";
son lo mismo.

## Desviaciones acordadas respecto al plan maestro

- **Base de datos y almacenamiento: Supabase** (Postgres gestionado, Supabase Storage).
  El plan maestro describía Postgres compartido con rol por cliente (ADR-03) y MinIO
  (ADR-09). El aislamiento entre comercios pasa a ser **un proyecto Supabase por comercio**.
- **Auth del panel: Better Auth (ADR-04)**, sobre el **mismo Postgres** que Prisma
  (`src/lib/auth.ts`). Correo/contraseña; registro cerrado (`disableSignUp`); el
  propietario se siembra desde `OWNER_EMAIL`/`OWNER_PASSWORD` y el resto se crea en
  `/panel/usuarios`. El rol vive en `user.role` (valores del enum `Role`). El chokepoint
  sigue siendo `src/features/auth/roles.ts` (`requireRole`/`requirePanel`).
  Better Auth además es **servidor de autorización MCP** (`jwt()` + `mcp()` + `cimd()`):
  `/api/mcp` publica herramientas de **solo lectura** sobre los datos del comercio.
  Las tablas de Better Auth conservan el naming de la librería (excepción a §24.1).
- **La identidad del POS no cambia**: token de dispositivo + PIN de operador (`argon2id`)
  validado localmente. Nunca pasa por Better Auth.
- **Sin monorepo**: un solo `package.json`. Las capas puras viven en `src/domain`,
  `src/theme`, `src/db`.
- **Next.js 16** (el plan dice 15).

## Reglas que no se negocian

1. Dinero SIEMPRE en centavos enteros, con sufijo de moneda: `totalBob`, `unitPriceBob`.
2. Lógica de negocio SOLO en `src/domain`. Pura: sin Prisma, sin Supabase, sin React,
   sin reloj. Recibe datos y devuelve datos.
3. Las existencias se derivan de `stock_movement`. Jamás una columna `stock` mutable.
   La tabla `variant_stock` es un resumen mantenido por trigger, no una fuente de verdad.
4. Nada se borra: `archivedAt`. Una venta sincronizada tarde puede apuntar a algo
   "borrado".
5. La venta cobrada nunca se rechaza. Existencia negativa es una alerta, no un error.
6. `"use client"` en `src/app/(shop)` exige un comentario justificándolo. El catálogo
   tiene presupuesto: menos de 120 KB de JS comprimido, verificado en CI.
7. Framer Motion y las bibliotecas de animación SOLO en la landing, con `next/dynamic`.
8. El código está en inglés; la interfaz, los mensajes y los docs, en español.
   Términos sin traducción limpia se conservan: `folio`, `arqueo`.
9. Todo esquema de entrada se valida con zod en el límite. Toda action comprueba el rol.
10. Máximo 400 líneas por archivo, 60 por función.

## Antes de escribir

- ¿Esto tiene que funcionar sin conexión? Si sí, va en `src/domain` y se prueba en ambos
  lados.
- ¿Agrega JS al catálogo? Decir cuánto.
- ¿Toca dinero, existencias o sincronización? Trae su prueba en el mismo cambio.

## Estructura

Los módulos se separan **por feature** (§3.1): `src/features/<feature>/` con sus
`queries.ts`, `actions.ts` ("use server"), `schemas.ts` (zod) y `components/`.

```
src/app/(shop)    público    · SSR con Cache Components, presupuesto estricto
src/app/(admin)   panel      · /entrar + /panel/*, gateado por rol, `instant = false`
src/app/(pos)     caja       · local primero (fases 5-6)
src/features/     catalog · auth · panel · products · categories · discounts · media · import
                  cart · orders · settings · inventory · scanner · labels · pos · content
src/server/       infra transversal de servidor (rate-limit)
src/components/ui shadcn/ui (radix-nova) — base de todos los componentes; fuera del lint
src/components/   compartido no-feature (json-ld, breadcrumbs, skeletons)
src/domain        lógica pura compartida servidor ↔ POS
src/theme         tokens OKLCH + presets de tema y de tarjeta
src/db            cliente Prisma + getSiteSettings() cacheado
src/storage       Supabase Storage (bucket product-images)
prisma            esquema, migraciones, prisma/sql/*.sql (triggers, búsqueda)
```

## Reglas de Fase 2

- Componentes nuevos: `shadcn add <x>` primero; no reinventar primitivas.
- Toda server action: `requireRole(...)` + zod + `revalidateTag(tag, "max")` (Next 16
  exige el 2º argumento).
- Objetos de dominio/imágenes/SQL raro que Prisma no expresa → `prisma/sql/` + migración
  con `migrate resolve --applied` para no chocar con la deriva.
- Nada se borra: `archivedAt`. El panel usa tokens neutros de shadcn; la tienda `.shop-surface`.

## Comandos — desarrollo en el host con pnpm

El desarrollo diario es `pnpm dev` en Windows (Node 22+ + Corepack). Los archivos de
Docker/Compose/Makefile quedan en el repo como **referencia para producción/CI**, no se
usan a diario.

```
pnpm dev                              # servidor de desarrollo (Next 16, Turbopack)
pnpm verify                           # typegen + biome + tsc + vitest
pnpm test / pnpm e2e / pnpm perf
pnpm prisma migrate dev --name X      # migración contra Supabase (DIRECT_URL)
pnpm db:sql                           # aplica prisma/sql/*.sql (triggers, búsqueda)
pnpm db:seed -- --products=2000 --seed=42
```

## Reglas de Fase 8 (personalización, tablero, reportes, PWA)

- **8 presets de tema** en `src/theme/presets.ts` (§10.1). El "tema base" fija de
  una vez el par tipográfico, la escala, la densidad, la forma de tarjeta y la
  disposición de portada. Agregar un preset = una entrada en `PRESETS`.
- **Tipografías locales** (`src/theme/fonts.ts`, `next/font/local`, woff2 OFL en
  `src/theme/fonts/`, `preload: false`): nunca `next/font/google` para la tienda.
  6 pares curados; el catálogo solo descarga el par activo.
- `deriveTokens` sigue **puro y probado**; el editor lo usa en cliente para la
  vista previa. El editor de apariencia manda a `saveAppearanceAction` solo al
  pulsar Guardar; la vista previa es un iframe a `/apariencia-preview` +
  `postMessage` (único `"use client"` de `(shop)` junto al SW).
- **Reportes sobre agregados** (§18.3): `daily_sales_rollup` /
  `daily_product_rollup` / `daily_payment_rollup`, rehechas por
  `glass_refresh_rollup(from,to)` (`prisma/sql/rollup.sql`). El trabajo nocturno
  es `POST /api/cron/rollup` (`CRON_SECRET`, comparación en tiempo constante);
  las lecturas refrescan los últimos 3 días al vuelo (`ensureFreshRollup`).
  Nunca recorrer `sale`/`stock_movement` entero para un reporte.
- Los 7 reportes viven en `src/features/reports/registry.ts` (`ReportDef`): una
  entrada declara columnas + filtros + `run(filters)`. `margen` es solo
  `PROPIETARIO`. Exportan CSV y PDF con la marca del comercio (`pdf.ts`).
- **PWA del catálogo** (§22.8): `src/app/manifest.ts` dinámico + `public/catalogo-sw.js`
  que **solo cachea `/_next/static/` e imágenes** — sin fallback offline. El POS
  conserva `/pos.webmanifest`.
- Respaldos: `deploy/backup.sh` / `deploy/restore-test.sh`, doc en
  `docs/respaldos.md`. Cifrado `age`, la clave privada nunca en el VPS.

## Reglas de Fase 7 (contenido y blog)

- CMS propio en la misma base (ADR-10). Cada bloque es un registro `page_block`
  con `type` + `position` + `data` JSON validado por un zod del registro
  (`src/features/content/blocks/registry.ts`). Agregar un bloque = un esquema, una
  entrada y un componente.
- Los 10 bloques de §11.1: `HERO, BENTO, PRODUCT_GRID, TEXT_MEDIA, GALLERY,
  TESTIMONIALS, FAQ, MAP_CONTACT, CTA_WHATSAPP, POSTS`.
- **Ningún bloque ejecuta HTML del cliente.** El texto enriquecido es un AST
  (`src/domain/rich-text.ts`), se **sanea al guardar** (`sanitizeRichText`) y se
  renderiza sin `dangerouslySetInnerHTML`. `href` solo `http(s)`/`/`/`mailto:`/`tel:`.
- La portada `/` es una `Page` con `isHome` publicada; si no hay, va
  `<DefaultHome>`.
- Borrador: `Page`/`Post` llevan `draftToken` único; `/borrador/[token]` lo
  muestra con `noindex`. Publicar invalida `revalidateTag("content", "max")`.
- `motion` (animación) solo en `src/features/content/components`, en su propio
  chunk; biome lo prohíbe en `(shop)`, `catalog`, `components`. `@dnd-kit` igual
  (editor del panel).
- El blog es opcional (§11.2): va después de "Páginas" en el panel, nunca primero.

## Reglas de Fase 6 (POS sin conexión)

- **La ruta de cobro no toca la red.** `recordLocalSale` escribe el ticket y encola
  el comando `SALE` en **una sola transacción Dexie** (`src/features/pos/offline/`):
  matar el proceso a mitad deja la venta entera o nada. El vuelto sale local con
  `changeDue`.
- Identidad en el origen: cada comando lleva `clientId` (UUID v7), `deviceId` y
  `seq` **contiguo y creciente** por dispositivo. El servidor (`/api/sync/batch`)
  es idempotente sobre `clientId` (índice único en `Sale.clientSaleId` y
  `SyncCommand.clientId`) e impone el orden con `planBatch` (`src/domain/sync.ts`);
  rechaza huecos.
- La venta cobrada **nunca se rechaza** por stock: existencia negativa es alerta en
  `/panel/sincronizacion`, se corrige con `AJUSTE`, nunca a mano.
- Dispositivo revocado → **cuarentena** (`SyncCommand.status = QUARANTINED`), no
  descarte. El dueño libera desde el panel (`releaseQuarantineAction`).
- El folio `V-` lo asigna el servidor; offline la venta se identifica por
  `clientSaleId` y el comprobante dice "folio pendiente" hasta el acuse.
- Caducidad del paquete (`packageStatus`, dominio): 24 h aviso ámbar, 72 h bloqueo
  de ventas nuevas con desbloqueo por PIN del propietario. Umbrales en `SiteSettings`.
- PIN sin conexión: `hash-wasm` (argon2id WASM) valida contra los hashes del
  paquete. `dexie` y `hash-wasm` están prohibidos por biome fuera de
  `src/features/pos`.
- El núcleo de la venta vive en `src/features/pos/apply-sale.ts`
  (`applySaleCommand`), reusado por `createSaleAction` (en línea) y por el lote.
- Abrir/cerrar turno siguen exigiendo red (la `CashSession` es del servidor); el
  cierre espera a que la cola esté vacía.

## Reglas de Fase 5 (POS en línea)

- Identidad del POS = **token de dispositivo** (opaco, `localStorage`) + **PIN de
  operador** (`argon2id`, validado en el servidor). Nunca Supabase. Toda action del
  POS empieza con `requireDevice(token)`.
- La venta trae su identidad del origen: `clientSaleId` (UUID v7 del navegador).
  `createSaleAction` es **idempotente** sobre `clientSaleId` (reenviar = devolver la
  existente). Prepara el terreno de la Fase 6.
- La venta cobrada **nunca se rechaza** por existencias: genera el `StockMovement`
  `VENTA` y, si queda negativo, es alerta.
- Orden de cálculo del §13.1 vía `buildSale` (dominio): línea → subtotal → global →
  redondeo. El `roundingBob` se guarda, no se reparte.
- Descuento de caja > `settings.maxCashierDiscountPercent` (por defecto 0) exige PIN
  de rol superior (`requireAuthPin`), registrado en `Sale.authorizedByOperatorId` (§6.4).
- Arqueo (§16.2): el operador declara el conteo **antes** de ver lo esperado.
  `computeArqueo` (dominio). Diferencia sobre umbral → nota obligatoria. Sesión
  cerrada = inmutable.
- Pedido → venta: `createSaleAction` con `orderId` enlaza `Order.saleId` y pasa a
  `ENTREGADO`; el `PEDIDO_ENTREGADO` no se duplica (`advanceOrderAction` ya lo evita).

## Reglas de Fase 4 (inventario y escaneo)

- Las existencias solo se mueven con asientos en `stock_movement` (`sourceType` +
  `sourceId`). Nadie escribe `variant_stock` (lo mantiene el trigger); una toma de
  inventario **genera los `AJUSTE`** que explican la diferencia, no "arregla" el número.
- La venta/pedido cobrado nunca se rechaza; existencia negativa es alerta, no error.
- El escáner vive en `src/features/scanner` (`<ScanField>` = tipeo + HID + cámara).
  `@zxing/*` se carga con `import()` diferido y biome lo prohíbe en `(shop)`,
  `features/catalog` y `components`.
- Etiquetas: PDF por lote con `pdf-lib`; las barras se dibujan desde el codificador puro
  `src/domain/barcode.ts` (Code-128 / EAN-13). Ruta `/panel/etiquetas/pdf`.
- Inventario y etiquetas admiten el rol `ALMACEN` (`requireInventory()` / `INVENTORY_ROLES`).

## Rendimiento del catálogo (Fase 1)

- `next.config.ts` usa `cacheComponents: true`. Las lecturas cacheables llevan `"use cache"`
  + `cacheTag(...)` (`settings`, `catalog`, `featured`, `product:{id}`).
- El precio/existencia de la GRILLA salen de una sola consulta SQL cacheada
  (`src/catalog/list-query.ts`); la separación fina estático/dinámico del §7.1 vive en la
  FICHA (`<PriceTag>` / `<StockBadge>` dentro de `<Suspense>`).
- Nada de `framer-motion` en `src/app/(shop)` ni en `src/components` (regla de biome).
