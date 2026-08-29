# Glass

Catálogo en línea + punto de venta + inventario para comercios pequeños. Se vende
empaquetado: una instancia por cliente. El plan maestro manda: [`docs/plan-maestro.html`](docs/plan-maestro.html).

## Estado

**Fase 8 — completa.** El roadmap del §25 está terminado: catálogo público, panel
y CMS, inventario y escaneo, POS en línea y sin conexión, personalización con
editor de apariencia, tablero y reportes, PWA y respaldos.

## Requisitos

- **Node 22+** y **Corepack** (`corepack enable` → pnpm 11) en el host.
- Un proyecto de **Supabase** (Postgres + Storage). La auth del panel es
  **Better Auth** sobre ese mismo Postgres — no necesita las claves de API de Supabase.
- Docker es opcional: los archivos de `docker/` y `compose*.yml` quedan como referencia para
  producción/CI, no para el desarrollo diario.

## Puesta en marcha

```sh
cp .env.example .env                      # DATABASE_URL/DIRECT_URL, BETTER_AUTH_SECRET,
                                          #   OWNER_EMAIL, OWNER_PASSWORD
pnpm install
pnpm prisma migrate deploy                # esquema → Postgres
pnpm db:sql                               # triggers de stock + búsqueda + rollup
pnpm db:seed -- --products=2000 --seed=42 # catálogo + ventas + propietario del panel
pnpm dev                                  # http://localhost:3000
```

Los reportes (§18) se calculan sobre tablas de agregado diario que refresca un
trabajo nocturno: `POST /api/cron/rollup` con `Authorization: Bearer $CRON_SECRET`
(cron de Coolify). `pnpm db:rollup` rehace el historial a mano. El catálogo es
una PWA instalable (solo cachea assets, sin modo sin conexión); el POS tiene su
propio manifiesto. Respaldos: `docs/respaldos.md`.

Entrá al panel en `/entrar` con `OWNER_EMAIL` + `OWNER_PASSWORD`; cambiá la
contraseña y creá al resto del equipo en `/panel/usuarios`.

**Servidor MCP**: el panel expone OAuth 2.1 (`/api/auth/.well-known/oauth-authorization-server`)
y herramientas de solo lectura en `/api/mcp`. Un cliente MCP descubre el flujo,
pasa por `/entrar` → `/consent` y obtiene un token.

> Sin `SUPABASE_SERVICE_ROLE_KEY` la siembra omite subir las imágenes del pool
> (los productos quedan con su `blurDataURL` de gradiente).

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | servidor de desarrollo |
| `pnpm verify` | typegen + biome + tsc + vitest |
| `pnpm test` / `pnpm e2e` | unitarias / Playwright |
| `pnpm perf` | Lighthouse CI (necesita Chrome/Edge) |
| `pnpm prisma migrate dev --name X` | nueva migración |
| `pnpm db:sql` | (re)aplica `prisma/sql/*.sql` (idempotente) |
| `pnpm db:seed -- --products=N --seed=S` | siembra determinista |

## Estructura

```
prisma/            esquema, migraciones, SQL (triggers, búsqueda), siembra
src/domain/        lógica pura compartida servidor ↔ POS (dinero, precios, stock, venta, PIN)
src/theme/         derivación de tokens OKLCH + presets de tema y de tarjeta
src/db/            cliente Prisma + ajustes del sitio cacheados
src/catalog/       consultas del catálogo, precio efectivo, existencias, búsqueda
src/components/    UI del catálogo (Server Components; formularios nativos)
src/features/auth  Better Auth (panel) · src/features/pos dispositivo+PIN (POS)
src/storage/       Supabase Storage
src/app/(shop)/    superficie pública — SSR con Cache Components (§7.1)
src/app/(admin|pos)/  placeholders (fases 2 y 5)
docker/, compose*.yml, Makefile   referencia para producción/CI
```

## Repositorio remoto

Aún local. Cuando exista el repo `Glass` en GitHub:

```sh
git remote add origin git@github.com:<cuenta>/Glass.git
git push -u origin master
```
