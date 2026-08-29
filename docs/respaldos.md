# Respaldos y prueba de restauración

Un respaldo que nunca se restaura no es un respaldo. Este documento cubre el
esquema de Glass: volcado nocturno cifrado fuera del VPS, retención de 30 días y
una prueba de restauración mensual.

## Qué se respalda

Toda la base Postgres del comercio (`pg_dump` completo). Las imágenes de producto
viven en Supabase Storage y tienen su propia redundancia; si el comercio las
considera críticas, se agrega `rclone sync` del bucket al mismo remoto.

## Piezas

| Archivo | Qué hace |
|---|---|
| `deploy/backup.sh` | `pg_dump` → `gzip` → cifrado `age` → `rclone copy` al remoto → poda de retención |
| `deploy/restore-test.sh` | baja el último respaldo, lo restaura en una base descartable, corre consultas de cordura, la borra |

## Variables

En el entorno de la instancia (Coolify):

```
DIRECT_URL=postgresql://…:5432/postgres      # conexión directa, no el pooler
BACKUP_AGE_RECIPIENT=age1qz…                  # clave PÚBLICA age
BACKUP_REMOTE=r2:glass-backups/ferreteria-lopez
BACKUP_RETENTION_DAYS=30
```

La **clave privada `age` no vive en el VPS**. Se guarda en el gestor de secretos
de DIMA; sin ella nadie puede leer los respaldos aunque acceda al bucket.

`rclone` se configura una vez por nodo (`rclone config`) con las credenciales del
almacenamiento (Cloudflare R2, Backblaze B2 o S3).

## Programación

Cron de Coolify en la instancia, diario a las 03:15 (hora de La Paz):

```
15 3 * * *  /app/deploy/backup.sh >> /var/log/glass-backup.log 2>&1
```

## Restauración real (incidente)

1. Levantar un Postgres vacío (o una base nueva en el mismo servidor).
2. `rclone copyto "$BACKUP_REMOTE/<archivo>.sql.gz.age" dump.sql.gz.age`
3. `age -d -i clave-privada.txt dump.sql.gz.age | gunzip > dump.sql`
4. `createdb glass_restore && psql glass_restore -f dump.sql`
5. Apuntar `DATABASE_URL`/`DIRECT_URL` de la instancia a la base restaurada y
   reiniciar el contenedor. Las migraciones ya están aplicadas dentro del dump.

**RPO**: hasta 24 h (último respaldo nocturno). **RTO**: ~30 min con el dump a
mano.

## Prueba mensual

```
BACKUP_REMOTE=… BACKUP_AGE_IDENTITY=./clave-privada.txt \
RESTORE_PG_URL=postgresql://postgres@localhost:5432/postgres \
  sh deploy/restore-test.sh
```

Debe imprimir `PASS` con conteos de productos y ventas coherentes. Si imprime
`FAIL`, el respaldo está corrupto o incompleto: revisar el log del cron y la
configuración de `rclone`/`age` antes de que haga falta de verdad.
