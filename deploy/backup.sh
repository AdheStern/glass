#!/bin/sh
# Glass — respaldo nocturno de la base (§4.1, §22). pg_dump → gzip → cifrado con
# age → subida fuera del VPS con rclone → poda de retención. Idempotente y apto
# para cron. Requiere: pg_dump, gzip, age, rclone.
#
#   DIRECT_URL           conexión directa a Postgres (5432)
#   BACKUP_AGE_RECIPIENT clave pública age (age1...) — la privada NO vive en el VPS
#   BACKUP_REMOTE        destino rclone, p. ej. r2:glass-backups/ferreteria-lopez
#   BACKUP_RETENTION_DAYS  (opcional, por defecto 30)
#
# Cron de Coolify (diario 03:15):
#   15 3 * * *  /app/deploy/backup.sh >> /var/log/glass-backup.log 2>&1
set -eu

: "${DIRECT_URL:?falta DIRECT_URL}"
: "${BACKUP_AGE_RECIPIENT:?falta BACKUP_AGE_RECIPIENT}"
: "${BACKUP_REMOTE:?falta BACKUP_REMOTE}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SLUG="${SITE_SLUG:-glass}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
FILE="$WORK/${SLUG}-${STAMP}.sql.gz.age"

echo "glass/backup: volcando la base ($SLUG)..."
pg_dump --no-owner --no-privileges --format=plain "$DIRECT_URL" \
  | gzip -9 \
  | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$FILE"

SIZE="$(wc -c < "$FILE")"
if [ "$SIZE" -lt 1024 ]; then
  echo "glass/backup: el volcado es sospechosamente pequeño ($SIZE bytes), aborto" >&2
  exit 1
fi

echo "glass/backup: subiendo a $BACKUP_REMOTE ($SIZE bytes)..."
rclone copy "$FILE" "$BACKUP_REMOTE/" --no-traverse

echo "glass/backup: podando respaldos de más de $RETENTION_DAYS días..."
rclone delete "$BACKUP_REMOTE/" --min-age "${RETENTION_DAYS}d" --include "${SLUG}-*.sql.gz.age"

echo "glass/backup: ok — ${SLUG}-${STAMP}.sql.gz.age"
