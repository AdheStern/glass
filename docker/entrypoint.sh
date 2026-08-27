#!/bin/sh
# Arranque del contenedor de producción (§22.7).
# Corre las migraciones antes de servir. Deben ser compatibles hacia atrás (§4.4).
set -e

PRISMA="node node_modules/prisma/build/index.js"

echo "glass: aplicando migraciones (prisma migrate deploy)..."
$PRISMA migrate deploy

echo "glass: aplicando trigger de existencias..."
$PRISMA db execute --file prisma/sql/stock_trigger.sql --schema prisma/schema.prisma

echo "glass: iniciando servidor Next..."
exec "$@"
