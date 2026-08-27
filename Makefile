# Glass — envoltura de docker compose (§22.5). Nada de esto requiere Node en el anfitrión.
.DEFAULT_GOAL := help

COMPOSE      := docker compose -f compose.yml -f compose.dev.yml
COMPOSE_TEST := docker compose -f compose.yml -f compose.test.yml

.PHONY: help up down logs sh restart lock install migrate deploy sql seed reset test e2e studio image

help: ## Lista los objetivos disponibles
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Levanta la app (contenedor) + Mailpit
	$(COMPOSE) up -d --build
	@echo "app  -> http://localhost:3000"
	@echo "mail -> http://localhost:8025"

down: ## Detiene los contenedores
	$(COMPOSE) down

logs: ## Sigue los logs de la app
	$(COMPOSE) logs -f app

sh: ## Abre una shell dentro del contenedor de la app
	$(COMPOSE) exec app sh

restart: ## Reinicia la app
	$(COMPOSE) restart app

lock: ## Regenera pnpm-lock.yaml dentro de un contenedor
	$(COMPOSE) run --rm --no-deps app pnpm install --lockfile-only

install: ## Instala dependencias dentro del contenedor (actualiza el volumen)
	$(COMPOSE) run --rm --no-deps app pnpm install

migrate: ## Crea/aplica una migración: make migrate n=nombre_de_la_migracion
	@test -n "$(n)" || (echo "falta n=: make migrate n=agregar_x" && exit 1)
	$(COMPOSE) exec app pnpm prisma migrate dev --name $(n) --skip-seed
	$(COMPOSE) exec app pnpm db:sql

deploy: ## Aplica migraciones pendientes sin crear nuevas
	$(COMPOSE) exec app pnpm db:deploy
	$(COMPOSE) exec app pnpm db:sql

sql: ## (Re)aplica el trigger de existencias (idempotente)
	$(COMPOSE) exec app pnpm db:sql

seed: ## Migra + trigger + siembra 2000 productos y 6 meses de ventas (semilla 42)
	$(COMPOSE) exec app pnpm db:deploy
	$(COMPOSE) exec app pnpm db:sql
	$(COMPOSE) exec app pnpm db:seed -- --products=2000 --seed=42

reset: ## Borra volúmenes, vuelve a levantar y siembra desde cero
	$(COMPOSE) down -v
	$(MAKE) up
	@echo "esperando a la app..." && sleep 8
	$(MAKE) seed

test: ## Corre verify (biome + tsc + vitest) con Postgres efímero
	$(COMPOSE_TEST) run --rm test
	$(COMPOSE_TEST) down -v

e2e: ## Corre el humo de Playwright contra la app de desarrollo
	$(COMPOSE) up -d app
	$(COMPOSE) --profile e2e run --rm e2e

studio: ## Abre Prisma Studio (http://localhost:5555)
	$(COMPOSE) exec app pnpm db:studio

image: ## Construye la imagen de producción y verifica el presupuesto de 250 MB
	docker build --target runner -t glass:local -f docker/Dockerfile .
	@size=$$(docker image inspect glass:local --format '{{.Size}}'); \
	 mb=$$((size / 1024 / 1024)); \
	 echo "imagen: $${mb} MB"; \
	 test $$mb -le 250 || (echo "PRESUPUESTO SUPERADO (> 250 MB)" && exit 1)
