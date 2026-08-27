@AGENTS.md

# Glass — contexto permanente para Claude Code

## Qué es esto

Catálogo en línea + punto de venta + inventario para comercios pequeños en Bolivia.
Se vende empaquetado: una instancia por cliente. El plan maestro está en
`docs/plan-maestro.html` y manda sobre cualquier otra cosa.

El producto se llama **Glass**. El plan maestro usa el nombre interno anterior "Vitrina";
son lo mismo.

## Desviaciones acordadas respecto al plan maestro

- **Base de datos, almacenamiento y auth del panel: Supabase** (Postgres gestionado,
  Supabase Storage, Supabase Auth). El plan maestro describía Postgres compartido con rol
  por cliente (ADR-03), MinIO (ADR-09) y Better Auth (ADR-04). El aislamiento entre
  comercios pasa a ser **un proyecto Supabase por comercio**.
- **La identidad del POS no cambia**: sesión de dispositivo + PIN de operador (`argon2id`)
  validado localmente. Supabase Auth es solo para el panel.
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
                  cart · orders · settings · inventory · scanner · labels
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
