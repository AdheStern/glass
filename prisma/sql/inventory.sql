-- Glass — vista de alertas de inventario (§14.4). Solo lectura: la consultan los
-- reportes del panel. Nadie escribe aquí; el saldo sale de `variant_stock`.
-- Idempotente.

CREATE OR REPLACE VIEW variant_stock_alert AS
SELECT
  v.id                                   AS variant_id,
  v.product_id,
  p.name                                 AS product_name,
  p.slug                                 AS product_slug,
  v.sku,
  v.barcode,
  v.attributes,
  v.min_stock,
  v.cost_bob,
  COALESCE(sk.qty, 0)                     AS on_hand,
  sk.last_movement_at,
  (v.min_stock > 0 AND COALESCE(sk.qty, 0) <= v.min_stock) AS below_min,
  (COALESCE(sk.qty, 0) < 0)              AS negative,
  (v.barcode IS NULL OR v.barcode = '')  AS no_barcode
FROM variant v
JOIN product p ON p.id = v.product_id
LEFT JOIN variant_stock sk ON sk.variant_id = v.id
WHERE v.archived_at IS NULL
  AND p.archived_at IS NULL;
