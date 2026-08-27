#!/bin/sh
# Arranque del contenedor de desarrollo (§22.3).
# node_modules vive en un volumen nombrado: si está vacío, instala.
set -e

if [ ! -x "node_modules/.bin/next" ]; then
  echo "glass: node_modules vacío o incompleto, instalando dependencias..."
  pnpm install
fi

echo "glass: generando cliente Prisma..."
pnpm db:generate >/dev/null 2>&1 || pnpm db:generate

exec "$@"
