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

```
src/app/(shop)    público    · SSR estático, presupuesto estricto
src/app/(admin)   panel      · cliente, sin obsesión por el peso
src/app/(pos)     caja       · local primero, cola de sincronización
src/domain        lógica pura compartida
src/theme         tokens OKLCH y presets
src/db            Prisma
src/auth          Supabase (panel) + dispositivo/PIN (POS)
src/storage       Supabase Storage
prisma            esquema, migraciones, siembra
```

## Comandos — TODO corre en contenedores (§22)

Nunca sugieras instalar Node, Postgres o pnpm en el anfitrión, ni ejecutar pnpm fuera del
contenedor.

```
make up · make seed · make sh · make test · make e2e · make logs · make down · make reset
make migrate n={nombre}          # prisma migrate dev dentro del contenedor
make lock                        # regenera pnpm-lock.yaml dentro del contenedor
```

Dentro del contenedor: `pnpm dev` · `pnpm test` · `pnpm db:seed -- --products=2000 --seed=42`
