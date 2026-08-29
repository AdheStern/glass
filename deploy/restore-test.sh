#!/bin/sh
# Glass — prueba de restauración (§25 checklist de Fase 8). Baja el último
# respaldo, lo descifra y lo restaura en una base descartable, corre consultas de
# cordura y la borra. Imprime PASS o FAIL. Se corre a mano una vez por mes; un
# respaldo que no se restaura no es un respaldo.
#
#   BACKUP_REMOTE          origen rclone (mismo que backup.sh)
#   BACKUP_AGE_IDENTITY    ruta al archivo de clave privada age (NO en el VPS de prod)
#   RESTORE_PG_URL         Postgres donde crear la base de prueba (con permiso CREATEDB)
set -eu

: "${BACKUP_REMOTE:?falta BACKUP_REMOTE}"
: "${BACKUP_AGE_IDENTITY:?falta BACKUP_AGE_IDENTITY}"
: "${RESTORE_PG_URL:?falta RESTORE_PG_URL}"

SLUG="${SITE_SLUG:-glass}"
WORK="$(mktemp -d)"
TESTDB="glass_restore_test_$(date -u +%s)"
trap 'rm -rf "$WORK"; psql "$RESTORE_PG_URL" -c "DROP DATABASE IF EXISTS \"$TESTDB\"" >/dev/null 2>&1 || true' EXIT

LATEST="$(rclone lsf "$BACKUP_REMOTE/" --include "${SLUG}-*.sql.gz.age" | sort | tail -n1)"
[ -n "$LATEST" ] || { echo "FAIL: no hay respaldos en $BACKUP_REMOTE"; exit 1; }
echo "glass/restore-test: usando $LATEST"

rclone copyto "$BACKUP_REMOTE/$LATEST" "$WORK/dump.sql.gz.age"
age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$WORK/dump.sql.gz.age" | gunzip > "$WORK/dump.sql"

psql "$RESTORE_PG_URL" -c "CREATE DATABASE \"$TESTDB\"" >/dev/null
BASE_URL="${RESTORE_PG_URL%/*}"
psql "$BASE_URL/$TESTDB" -v ON_ERROR_STOP=1 -q -f "$WORK/dump.sql" >/dev/null

SALES="$(psql "$BASE_URL/$TESTDB" -tAc "SELECT count(*) FROM sale" 2>/dev/null || echo 0)"
PRODUCTS="$(psql "$BASE_URL/$TESTDB" -tAc "SELECT count(*) FROM product" 2>/dev/null || echo 0)"
LAST_SALE="$(psql "$BASE_URL/$TESTDB" -tAc "SELECT max(occurred_at_device) FROM sale" 2>/dev/null || echo '-')"

echo "glass/restore-test: ventas=$SALES productos=$PRODUCTS última venta=$LAST_SALE"
if [ "$PRODUCTS" -gt 0 ] && [ "$SALES" -ge 0 ]; then
  echo "PASS"
else
  echo "FAIL: la base restaurada no tiene datos esperados"
  exit 1
fi
