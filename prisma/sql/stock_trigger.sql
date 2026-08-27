-- Glass — existencias derivadas (ADR-05).
-- `variant_stock` es una tabla-resumen mantenida por trigger: cada asiento en
-- `stock_movement` aplica su delta en O(1). No es fuente de verdad; el dominio
-- proyecta desde `stock_movement` para auditoría y para el modo sin conexión.
--
-- Idempotente: se puede correr en cada arranque (docker/entrypoint.sh) y antes
-- de sembrar (`make seed`).

CREATE OR REPLACE FUNCTION glass_apply_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO variant_stock (variant_id, qty, last_movement_at, updated_at)
  VALUES (NEW.variant_id, NEW.qty, NEW.occurred_at, now())
  ON CONFLICT (variant_id)
  DO UPDATE SET qty = variant_stock.qty + EXCLUDED.qty,
                last_movement_at = GREATEST(
                  COALESCE(variant_stock.last_movement_at, EXCLUDED.last_movement_at),
                  EXCLUDED.last_movement_at
                ),
                updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_movement_apply ON stock_movement;

CREATE TRIGGER trg_stock_movement_apply
AFTER INSERT ON stock_movement
FOR EACH ROW
EXECUTE FUNCTION glass_apply_stock_movement();

-- Reconciliación completa: reconstruye variant_stock desde cero.
-- Útil tras una carga masiva o para verificar el trigger en pruebas.
CREATE OR REPLACE FUNCTION glass_rebuild_variant_stock()
RETURNS void AS $$
BEGIN
  DELETE FROM variant_stock;
  INSERT INTO variant_stock (variant_id, qty, last_movement_at, updated_at)
  SELECT variant_id, COALESCE(SUM(qty), 0), MAX(occurred_at), now()
  FROM stock_movement
  GROUP BY variant_id;
END;
$$ LANGUAGE plpgsql;
