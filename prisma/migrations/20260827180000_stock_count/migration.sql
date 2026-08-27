-- CreateEnum
CREATE TYPE "StockCountStatus" AS ENUM ('ABIERTA', 'CERRADA', 'APLICADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StockCountScope" AS ENUM ('TODO', 'CATEGORIA', 'LIBRE');

-- AlterTable: variant_stock — lo llena el trigger (prisma/sql/stock_trigger.sql)
ALTER TABLE "variant_stock" ADD COLUMN "last_movement_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "stock_count" (
    "id" TEXT NOT NULL,
    "status" "StockCountStatus" NOT NULL DEFAULT 'ABIERTA',
    "scope" "StockCountScope" NOT NULL DEFAULT 'LIBRE',
    "category_id" TEXT,
    "note" TEXT,
    "created_by_user_id" TEXT,
    "frozen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_count_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_line" (
    "id" TEXT NOT NULL,
    "stock_count_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "theoretical_qty" INTEGER NOT NULL,
    "counted_qty" INTEGER,
    "unit_cost_bob" INTEGER,

    CONSTRAINT "stock_count_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_count_status_created_at_idx" ON "stock_count"("status", "created_at");

-- CreateIndex
CREATE INDEX "stock_count_line_variant_id_idx" ON "stock_count_line"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_line_stock_count_id_variant_id_key" ON "stock_count_line"("stock_count_id", "variant_id");

-- AddForeignKey
ALTER TABLE "stock_count" ADD CONSTRAINT "stock_count_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_line" ADD CONSTRAINT "stock_count_line_stock_count_id_fkey" FOREIGN KEY ("stock_count_id") REFERENCES "stock_count"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_line" ADD CONSTRAINT "stock_count_line_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
