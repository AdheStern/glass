# Plantilla de alta de un comercio nuevo

Objetivo: dar de alta un cliente en **menos de una hora**, sin tocar código
(§4). Marcá cada paso.

## 1 · Datos del comercio

- [ ] Nombre comercial: ______________________
- [ ] Dominio: ______________________
- [ ] Rubro (para elegir preset y datos de siembra de demo): ______________
- [ ] Correo del propietario: ______________________
- [ ] Números de WhatsApp con etiqueta (Ventas / Repuestos / …): ____________
- [ ] Color de marca (o logo del que extraerlo): ______________________

## 2 · Infraestructura

- [ ] Proyecto **Supabase** nuevo (Postgres + Storage). Anotar `DATABASE_URL`
      (pooler 6543) y `DIRECT_URL` (5432).
- [ ] Bucket de Storage `product-images` creado, política privada.
- [ ] App en **Coolify** apuntando a la imagen publicada (nunca compilar en el
      VPS).

## 3 · Variables de entorno (Coolify)

```
SITE_SLUG=ferreteria-lopez
SITE_URL=https://ferreterialopez.com
OWNER_EMAIL=lopez@gmail.com
OWNER_PASSWORD=<contraseña temporal, se cambia en el primer ingreso>
TZ=America/La_Paz
DEFAULT_CURRENCY=BOB
DEFAULT_LOCALE=es-BO

DATABASE_URL=…6543…?pgbouncer=true
DIRECT_URL=…5432…

BETTER_AUTH_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
BETTER_AUTH_URL=https://ferreterialopez.com

NEXT_PUBLIC_SUPABASE_URL=https://REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<solo Storage>

CRON_SECRET=<aleatorio, 32+ chars>
BACKUP_AGE_RECIPIENT=age1…
BACKUP_REMOTE=r2:glass-backups/ferreteria-lopez
```

## 4 · Primer despliegue

- [ ] El contenedor arranca: `prisma migrate deploy` + `prisma/sql/*.sql` corren
      en el entrypoint.
- [ ] Sembrar catálogo de arranque **o** importar el del cliente:
      `pnpm db:seed -- --products=0` siembra solo config + propietario; con
      `--products=N` agrega un catálogo de demo.
- [ ] `pnpm db:rollup` para dejar los agregados listos (si hubo import con
      ventas históricas).
- [ ] DNS y TLS resueltos por Traefik/Coolify.

## 5 · Configuración inicial (panel)

- [ ] Entrar a `/entrar` con `OWNER_EMAIL` / `OWNER_PASSWORD`, cambiar la
      contraseña.
- [ ] **Ajustes**: nombre, números de WhatsApp, pedido mínimo, horarios.
- [ ] **Apariencia**: color de marca + preset + forma de tarjeta. Verificar la
      insignia de contraste AA.
- [ ] **Usuarios**: crear al resto del equipo con su rol.
- [ ] Subir logo y favicon.

## 6 · Automatización

- [ ] Cron de respaldo:
      `15 3 * * *  /app/deploy/backup.sh >> /var/log/glass-backup.log 2>&1`
- [ ] Cron del rollup:
      `10 2 * * *  curl -fsS -XPOST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/rollup`
- [ ] `rclone` configurado en el nodo, clave privada `age` guardada fuera del VPS.

## 7 · Humo (los 6 recorridos de §23.1)

- [ ] Comprar: catálogo → carrito → pedido por WhatsApp con folio.
- [ ] Vender en caja: abrir turno → escanear → descuento con PIN → cobrar.
- [ ] Vender sin conexión: cortar red → vender → reconectar → sincroniza.
- [ ] Reponer: alta por escaneo → ingreso → aparece en el catálogo.
- [ ] Cerrar caja: declarar conteo → diferencia → sesión inmutable.
- [ ] Personalizar: cambiar color y preset → el catálogo público cambia, el
      contraste sigue AA.

## 8 · Entrega

- [ ] Enviar al cliente: URL del panel, credenciales temporales,
      `docs/manual-cliente.md`.
- [ ] Agendar la primera **prueba de restauración** a 30 días
      (`deploy/restore-test.sh`).
