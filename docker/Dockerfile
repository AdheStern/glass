# syntax=docker/dockerfile:1.7
# Glass — una sola fuente para los cuatro entornos (§22.4). Proyecto de un solo paquete.

FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"

# ---------------------------------------------------------------------------
# deps — instala dependencias con lockfile congelado (build, test, CI, prod)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# dev — objetivo de compose.dev.yml. El código y node_modules llegan por
# volumen; el entrypoint instala si el volumen está vacío y genera Prisma.
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true
COPY docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint
RUN chmod +x /usr/local/bin/dev-entrypoint
EXPOSE 3000
ENTRYPOINT ["dev-entrypoint"]
CMD ["pnpm", "dev"]

# ---------------------------------------------------------------------------
# build — compila la salida standalone de Next
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm db:generate && pnpm build

# ---------------------------------------------------------------------------
# runner — lo que corre en Coolify. Objetivo < 250 MB.
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

# Prisma CLI + engines + cliente generado, para correr migrate deploy al arrancar
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=deps  --chown=app:app /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps  --chown=app:app /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=build --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma

COPY --chown=app:app docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

USER app
EXPOSE 3000
ENTRYPOINT ["entrypoint"]
CMD ["node", "server.js"]
