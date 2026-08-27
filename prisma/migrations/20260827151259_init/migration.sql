-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('PROPIETARIO', 'ADMINISTRADOR', 'EDITOR', 'CAJERO', 'ALMACEN');

-- CreateEnum
CREATE TYPE "public"."StockDisplay" AS ENUM ('EXACTO', 'UMBRAL', 'OCULTO');

-- CreateEnum
CREATE TYPE "public"."RoundingMode" AS ENUM ('NONE', 'NEAREST_10', 'NEAREST_50');

-- CreateEnum
CREATE TYPE "public"."DiscountScope" AS ENUM ('GLOBAL', 'CATEGORY', 'PRODUCT');

-- CreateEnum
CREATE TYPE "public"."MovementKind" AS ENUM ('INGRESO', 'VENTA', 'PEDIDO_ENTREGADO', 'DEVOLUCION', 'MERMA', 'AJUSTE', 'CARGA_INICIAL');

-- CreateEnum
CREATE TYPE "public"."OrderChannel" AS ENUM ('WHATSAPP', 'POS', 'WEB');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('NUEVO', 'CONFIRMADO', 'PREPARADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "public"."ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "public"."BlockType" AS ENUM ('HERO', 'RICH_TEXT', 'IMAGE', 'GALLERY', 'BENTO', 'PRODUCT_GRID', 'CATEGORY_CAROUSEL', 'FAQ', 'CTA', 'MAP', 'CONTACT');

-- CreateEnum
CREATE TYPE "public"."CashMovementKind" AS ENUM ('INGRESO', 'RETIRO', 'GASTO');

-- CreateTable
CREATE TABLE "public"."site_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL,
    "logo_path" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "locale" TEXT NOT NULL DEFAULT 'es-BO',
    "theme_preset" TEXT NOT NULL,
    "brand_color" TEXT NOT NULL,
    "card_preset" TEXT NOT NULL,
    "density" TEXT NOT NULL DEFAULT 'COMODA',
    "home_layout" TEXT NOT NULL DEFAULT 'HERO',
    "whatsapp_numbers" JSONB NOT NULL DEFAULT '[]',
    "socials" JSONB NOT NULL DEFAULT '{}',
    "address" JSONB,
    "hours" JSONB NOT NULL DEFAULT '{}',
    "stock_display" "public"."StockDisplay" NOT NULL DEFAULT 'UMBRAL',
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "show_sold_out" BOOLEAN NOT NULL DEFAULT true,
    "rounding_mode" "public"."RoundingMode" NOT NULL DEFAULT 'NONE',
    "min_order_bob" INTEGER,
    "order_message_template" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_profile" (
    "id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'CAJERO',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'CAJERO',
    "user_id" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "app_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_pairing_code" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pairing_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_category" (
    "product_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("product_id","category_id")
);

-- CreateTable
CREATE TABLE "public"."product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "track_stock" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_tsv" tsvector,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."variant" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "attributes" JSONB,
    "base_price_bob" INTEGER NOT NULL,
    "cost_bob" INTEGER,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_image" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "blur_data_url" TEXT,

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "public"."DiscountScope" NOT NULL,
    "percent" INTEGER,
    "amount_bob" INTEGER,
    "category_id" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_movement" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "kind" "public"."MovementKind" NOT NULL,
    "qty" INTEGER NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "note" TEXT,
    "operator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."variant_stock" (
    "variant_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_stock_pkey" PRIMARY KEY ("variant_id")
);

-- CreateTable
CREATE TABLE "public"."order" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "channel" "public"."OrderChannel" NOT NULL DEFAULT 'WHATSAPP',
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'NUEVO',
    "customer_phone" TEXT,
    "customer_name" TEXT,
    "note" TEXT,
    "subtotal_bob" INTEGER NOT NULL,
    "discount_bob" INTEGER NOT NULL,
    "total_bob" INTEGER NOT NULL,
    "sale_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_item" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price_bob" INTEGER NOT NULL,
    "discount_bob" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "client_sale_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "operator_id" TEXT NOT NULL,
    "cash_session_id" TEXT NOT NULL,
    "authorized_by_operator_id" TEXT,
    "subtotal_bob" INTEGER NOT NULL,
    "discount_bob" INTEGER NOT NULL,
    "rounding_bob" INTEGER NOT NULL DEFAULT 0,
    "total_bob" INTEGER NOT NULL,
    "occurred_at_device" TIMESTAMP(3) NOT NULL,
    "received_at_server" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price_snapshot_at" TIMESTAMP(3) NOT NULL,
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale_item" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price_bob" INTEGER NOT NULL,
    "discount_bob" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sale_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_method" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "counts_in_drawer" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "method_id" TEXT NOT NULL,
    "amount_bob" INTEGER NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cash_session" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "opening_bob" INTEGER NOT NULL,
    "counted_bob" INTEGER,
    "expected_bob" INTEGER,
    "difference_bob" INTEGER,
    "note" TEXT,

    CONSTRAINT "cash_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cash_movement" (
    "id" TEXT NOT NULL,
    "cash_session_id" TEXT NOT NULL,
    "kind" "public"."CashMovementKind" NOT NULL,
    "amount_bob" INTEGER NOT NULL,
    "reason" TEXT,
    "operator_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "public"."ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "meta_title" TEXT,
    "meta_desc" TEXT,
    "published_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "cover_path" TEXT,
    "status" "public"."ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."page_block" (
    "id" TEXT NOT NULL,
    "page_id" TEXT,
    "post_id" TEXT,
    "type" "public"."BlockType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "page_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."slug_history" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "old_slug" TEXT NOT NULL,
    "new_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slug_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_log" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_DiscountToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DiscountToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_auth_user_id_key" ON "public"."user_profile"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_email_key" ON "public"."user_profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "device_token_key" ON "public"."device"("token");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_code_code_key" ON "public"."device_pairing_code"("code");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "public"."category"("slug");

-- CreateIndex
CREATE INDEX "category_parent_id_position_idx" ON "public"."category"("parent_id", "position");

-- CreateIndex
CREATE INDEX "product_category_category_id_idx" ON "public"."product_category"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "public"."product"("slug");

-- CreateIndex
CREATE INDEX "product_is_active_archived_at_idx" ON "public"."product"("is_active", "archived_at");

-- CreateIndex
CREATE INDEX "variant_product_id_idx" ON "public"."variant"("product_id");

-- CreateIndex
CREATE INDEX "variant_sku_idx" ON "public"."variant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "variant_barcode_key" ON "public"."variant"("barcode");

-- CreateIndex
CREATE INDEX "product_image_product_id_position_idx" ON "public"."product_image"("product_id", "position");

-- CreateIndex
CREATE INDEX "discount_scope_is_active_idx" ON "public"."discount"("scope", "is_active");

-- CreateIndex
CREATE INDEX "stock_movement_variant_id_occurred_at_idx" ON "public"."stock_movement"("variant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "stock_movement_source_type_source_id_idx" ON "public"."stock_movement"("source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_folio_key" ON "public"."order"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "order_sale_id_key" ON "public"."order"("sale_id");

-- CreateIndex
CREATE INDEX "order_status_created_at_idx" ON "public"."order"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_item_order_id_idx" ON "public"."order_item"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_folio_key" ON "public"."sale"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "sale_client_sale_id_key" ON "public"."sale"("client_sale_id");

-- CreateIndex
CREATE INDEX "sale_occurred_at_device_idx" ON "public"."sale"("occurred_at_device");

-- CreateIndex
CREATE INDEX "sale_cash_session_id_idx" ON "public"."sale"("cash_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_device_id_seq_key" ON "public"."sale"("device_id", "seq");

-- CreateIndex
CREATE INDEX "sale_item_sale_id_idx" ON "public"."sale_item"("sale_id");

-- CreateIndex
CREATE INDEX "payment_sale_id_idx" ON "public"."payment"("sale_id");

-- CreateIndex
CREATE INDEX "cash_session_operator_id_opened_at_idx" ON "public"."cash_session"("operator_id", "opened_at");

-- CreateIndex
CREATE INDEX "cash_movement_cash_session_id_idx" ON "public"."cash_movement"("cash_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_slug_key" ON "public"."page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "post_slug_key" ON "public"."post"("slug");

-- CreateIndex
CREATE INDEX "page_block_page_id_position_idx" ON "public"."page_block"("page_id", "position");

-- CreateIndex
CREATE INDEX "page_block_post_id_position_idx" ON "public"."page_block"("post_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "slug_history_entity_old_slug_key" ON "public"."slug_history"("entity", "old_slug");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "public"."audit_log"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_occurred_at_idx" ON "public"."audit_log"("occurred_at");

-- CreateIndex
CREATE INDEX "_DiscountToProduct_B_index" ON "public"."_DiscountToProduct"("B");

-- AddForeignKey
ALTER TABLE "public"."category" ADD CONSTRAINT "category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_category" ADD CONSTRAINT "product_category_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_category" ADD CONSTRAINT "product_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."variant" ADD CONSTRAINT "variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_image" ADD CONSTRAINT "product_image_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount" ADD CONSTRAINT "discount_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movement" ADD CONSTRAINT "stock_movement_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movement" ADD CONSTRAINT "stock_movement_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."variant_stock" ADD CONSTRAINT "variant_stock_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order" ADD CONSTRAINT "order_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_item" ADD CONSTRAINT "order_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale" ADD CONSTRAINT "sale_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale" ADD CONSTRAINT "sale_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale" ADD CONSTRAINT "sale_authorized_by_operator_id_fkey" FOREIGN KEY ("authorized_by_operator_id") REFERENCES "public"."operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale" ADD CONSTRAINT "sale_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_item" ADD CONSTRAINT "sale_item_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_item" ADD CONSTRAINT "sale_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment" ADD CONSTRAINT "payment_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment" ADD CONSTRAINT "payment_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "public"."payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_session" ADD CONSTRAINT "cash_session_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_session" ADD CONSTRAINT "cash_session_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_movement" ADD CONSTRAINT "cash_movement_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_movement" ADD CONSTRAINT "cash_movement_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."page_block" ADD CONSTRAINT "page_block_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."page_block" ADD CONSTRAINT "page_block_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DiscountToProduct" ADD CONSTRAINT "_DiscountToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DiscountToProduct" ADD CONSTRAINT "_DiscountToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
