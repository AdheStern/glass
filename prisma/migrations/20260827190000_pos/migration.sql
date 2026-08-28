-- AlterTable: operator — bloqueo progresivo del PIN (§6.2)
ALTER TABLE "operator"
  ADD COLUMN "pin_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pin_locked_until" TIMESTAMP(3);

-- AlterTable: site_settings — arqueo y descuento de caja (§16.2, §13.2)
ALTER TABLE "site_settings"
  ADD COLUMN "cash_difference_threshold_bob" INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN "max_cashier_discount_percent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "receipt_footer" TEXT;
