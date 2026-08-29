-- Glass — agregados diarios para el tablero y los reportes (§18.3). Recorrer el
-- libro entero para dibujar una curva de 14 días se arrastra al año; estas
-- tablas se refrescan por un trabajo nocturno (`/api/cron/rollup`) más el día en
-- curso al vuelo. Las tablas las crea la migración de Prisma; esta función es
-- idempotente y la aplica `pnpm db:sql`.
--
-- Día del negocio: `occurred_at_device` es un instante naive en UTC; se
-- convierte a la fecha local de Bolivia.

CREATE OR REPLACE FUNCTION glass_sale_day(ts timestamp)
RETURNS date AS $$
  SELECT (((ts AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION glass_refresh_rollup(from_day date, to_day date)
RETURNS integer AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM daily_sales_rollup   WHERE day BETWEEN from_day AND to_day;
  DELETE FROM daily_payment_rollup WHERE day BETWEEN from_day AND to_day;
  DELETE FROM daily_product_rollup WHERE day BETWEEN from_day AND to_day;

  WITH s AS (
    SELECT
      sa.id,
      glass_sale_day(sa.occurred_at_device)                       AS day,
      sa.operator_id,
      CASE WHEN o.id IS NULL THEN 'MOSTRADOR' ELSE 'PEDIDO' END   AS channel,
      sa.subtotal_bob, sa.discount_bob, sa.rounding_bob, sa.total_bob
    FROM sale sa
    LEFT JOIN "order" o ON o.sale_id = sa.id
    WHERE sa.voided_at IS NULL
      AND glass_sale_day(sa.occurred_at_device) BETWEEN from_day AND to_day
  ),
  cogs AS (
    SELECT si.sale_id, SUM(si.qty * COALESCE(v.cost_bob, 0)) AS cogs_bob
    FROM sale_item si
    JOIN variant v ON v.id = si.variant_id
    GROUP BY si.sale_id
  )
  INSERT INTO daily_sales_rollup
    (day, operator_id, channel, sales_count, gross_bob, discount_bob,
     rounding_bob, net_bob, cogs_bob)
  SELECT s.day, s.operator_id, s.channel,
         COUNT(*), SUM(s.subtotal_bob), SUM(s.discount_bob),
         SUM(s.rounding_bob), SUM(s.total_bob), COALESCE(SUM(c.cogs_bob), 0)
  FROM s
  LEFT JOIN cogs c ON c.sale_id = s.id
  GROUP BY s.day, s.operator_id, s.channel;

  INSERT INTO daily_payment_rollup (day, payment_method_id, amount_bob, payment_count)
  SELECT glass_sale_day(sa.occurred_at_device), p.method_id,
         SUM(p.amount_bob), COUNT(*)
  FROM payment p
  JOIN sale sa ON sa.id = p.sale_id
  WHERE sa.voided_at IS NULL
    AND glass_sale_day(sa.occurred_at_device) BETWEEN from_day AND to_day
  GROUP BY 1, p.method_id;

  INSERT INTO daily_product_rollup (day, variant_id, qty, net_bob, cogs_bob)
  SELECT glass_sale_day(sa.occurred_at_device), si.variant_id,
         SUM(si.qty),
         SUM(si.qty * si.unit_price_bob - si.discount_bob),
         SUM(si.qty * COALESCE(v.cost_bob, 0))
  FROM sale_item si
  JOIN sale sa ON sa.id = si.sale_id
  JOIN variant v ON v.id = si.variant_id
  WHERE sa.voided_at IS NULL
    AND glass_sale_day(sa.occurred_at_device) BETWEEN from_day AND to_day
  GROUP BY 1, si.variant_id;

  SELECT COUNT(*) INTO affected
  FROM daily_sales_rollup WHERE day BETWEEN from_day AND to_day;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;
