# Glass — manual del cliente

Guía corta para el dueño y el equipo del comercio. Todo se hace desde el panel:
`https://tu-dominio/entrar`.

## Entrar

Usás el correo y la contraseña que te dio DIMA al entregar el sistema. La primera
vez, cambiá la contraseña en **Usuarios → Mi contraseña**.

Roles:

| Rol | Puede |
|---|---|
| Propietario | Todo, incluido el reporte de margen y crear usuarios |
| Administrador | Todo menos el margen |
| Cajero | Pedidos y caja |
| Almacén | Inventario y etiquetas |

## El día a día

### Pedidos (la pantalla que mirás siempre)

**Panel → Pedidos**. Cuatro columnas: Nuevos, Confirmados, Preparados,
Entregados hoy. Tocá un pedido para avanzarlo de estado. Un pedido en ámbar lleva
más de dos horas sin atender; en rojo, más de un día.

Cuando el cliente viene a pagar, el cajero busca el pedido por folio en la caja y
lo cobra: ahí recién se descuenta el inventario.

### Caja (POS)

En la tablet, `https://tu-dominio/pos`. Se instala como app desde el navegador.

- **Abrir turno** con el efectivo inicial.
- Vender: escanear o buscar el producto, cobrar. El vuelto lo calcula el sistema.
- Si se corta internet, **se sigue vendiendo**: las ventas se guardan en la
  tablet y se sincronizan solas cuando vuelve la conexión.
- **Cerrar turno**: primero contás la plata y la declarás, después el sistema te
  muestra cuánto esperaba y la diferencia.

### Productos e inventario

**Panel → Productos** para el catálogo. **Panel → Inventario** para las
existencias: los ingresos, las mermas y las tomas de inventario. Las existencias
nunca se editan a mano; se corrigen con un ajuste que queda registrado.

**Panel → Etiquetas** imprime códigos de barras por lote en PDF.

## Personalizar la tienda

**Panel → Apariencia**. Elegís un color de marca y un tema de una lista corta; el
sistema arma el resto y garantiza que el texto siempre se lea bien. La vista
previa te muestra tu catálogo real mientras cambiás las opciones. Nada se publica
hasta que tocás **Guardar**.

## Los números

**Panel → Resumen** es la pantalla de inicio: lo vendido hoy, las ventas del día,
los pedidos sin atender y los productos bajo mínimo, cada uno comparado contra el
mismo día de la semana pasada.

**Panel → Reportes** tiene siete reportes para mirar una vez por semana (ventas,
más vendidos, margen, arqueos, movimientos de inventario, pedidos y conversión,
capital dormido). Todos se descargan en CSV para tu contador y en PDF con el
nombre de tu negocio.

## Si algo falla

- **No entra nadie al panel**: escribile a DIMA; puede resembrar el propietario.
- **La caja no sincroniza**: revisá **Panel → Sincronización**. Si hay comandos
  "en cuarentena", un dispositivo fue revocado; el propietario los libera desde
  ahí.
- **Una existencia quedó negativa**: es una alerta, no un error. Se corrige con
  un ajuste en Inventario, nunca cambiando el número a mano.
- **El paquete de la tablet caducó**: pasa si estuvo días sin conectarse. El
  propietario lo desbloquea con su PIN.
