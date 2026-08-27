-- CreateTable
CREATE TABLE "public"."import_batch" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "created_by_user_id" TEXT,
    "row_count" INTEGER NOT NULL,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "created_product_ids" JSONB NOT NULL DEFAULT '[]',
    "created_category_ids" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undone_at" TIMESTAMP(3),
    CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_batch_created_at_idx" ON "public"."import_batch"("created_at");
