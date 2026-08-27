-- AlterTable: order
ALTER TABLE "order"
  ADD COLUMN "whatsapp_label" TEXT,
  ADD COLUMN "source" TEXT,
  ADD COLUMN "status_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: order_item
ALTER TABLE "order_item"
  ADD COLUMN "name_snapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "product_slug" TEXT,
  ADD COLUMN "list_price_bob" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "note" TEXT;

-- Backfill de los pedidos ya sembrados
UPDATE "order_item" oi
SET "name_snapshot" = p.name,
    "product_slug" = p.slug,
    "list_price_bob" = oi.unit_price_bob + oi.discount_bob
FROM "variant" v JOIN "product" p ON p.id = v.product_id
WHERE oi.variant_id = v.id AND oi."name_snapshot" = '';

UPDATE "order" SET "status_changed_at" = "updated_at";

-- CreateIndex
CREATE INDEX "order_status_status_changed_at_idx" ON "order"("status", "status_changed_at");
