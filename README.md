# Glass

Catálogo en línea + punto de venta + inventario para comercios pequeños. Se vende
empaquetado: una instancia por cliente. El plan maestro manda: [`docs/plan-maestro.html`](docs/plan-maestro.html).

## Estado

**Fase 0 — Andamiaje.** Contenedores, esquema, dominio puro, tema y siembra.
El roadmap completo está en el §25 del plan maestro.

## Requisitos

- Docker Desktop (Windows/macOS/Linux). **Nada más**: ni Node, ni pnpm, ni Postgres
  en el anfitrión (§22.1).
- Un proyecto de **Supabase** (Postgres + Storage + Auth).

> En Windows, para que la recarga en caliente sea rápida, clona el repositorio
> dentro del sistema de archivos de WSL2 (`\\wsl$\...`), no en `C:\Users`.

## Puesta en marcha

```sh
cp .env.example .env          # y completa las claves de Supabase
make lock                     # genera pnpm-lock.yaml dentro de un contenedor (una vez)
make up                       # levanta la app + Mailpit
make migrate n=init           # crea la migración inicial + aplica el trigger de stock
make seed                     # 2000 productos + 6 meses de ventas (semilla 42)
```

- App: <http://localhost:3000>
- Bandeja de correo (Mailpit): <http://localhost:8025>

## Comandos

| Comando | Qué hace |
|---|---|
| `make up` / `make down` / `make logs` | ciclo de vida del entorno |
| `make sh` | shell dentro del contenedor de la app |
| `make migrate n=<nombre>` | `prisma migrate dev` + trigger de stock |
| `make seed` | siembra determinista (2000 productos, 6 meses) |
| `make reset` | borra volúmenes, vuelve a levantar y siembra |
| `make test` | `biome` + `tsc` + `vitest` con Postgres efímero |
| `make e2e` | humo de Playwright |
| `make image` | construye la imagen de producción y verifica el presupuesto de 250 MB |

## Estructura

```
docker/            Dockerfile multietapa + entrypoints
compose*.yml       base · dev · test
prisma/            esquema, migraciones, SQL del trigger, generador de siembra
src/domain/        lógica pura compartida servidor ↔ POS (dinero, precios, stock, venta, PIN)
src/theme/         derivación de tokens OKLCH + presets
src/db/            cliente Prisma
src/auth/          Supabase (panel) + guarda de rol; dispositivo/PIN (POS)
src/storage/       Supabase Storage
src/app/(shop|admin|pos)/   zonas de renderizado (§ADR-12)
```

## Repositorio remoto

Aún local. Cuando exista el repo `Glass` en GitHub:

```sh
git remote add origin git@github.com:<cuenta>/Glass.git
git push -u origin master
```
