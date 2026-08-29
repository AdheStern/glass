-- Glass — agregados diarios para el tablero y los reportes (§18.3).
-- Las rellena `glass_refresh_rollup(from, to)` (prisma/sql/rollup.sql).

CREATE TABLE "public"."daily_sales_rollup" (
    "day" DATE NOT NULL,
    "operator_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sales_count" INTEGER NOT NULL,
    "gross_bob" INTEGER NOT NULL,
    "discount_bob" INTEGER NOT NULL,
    "rounding_bob" INTEGER NOT NULL,
    "net_bob" INTEGER NOT NULL,
    "cogs_bob" INTEGER NOT NULL,

    CONSTRAINT "daily_sales_rollup_pkey" PRIMARY KEY ("day","operator_id","channel")
);

CREATE TABLE "public"."daily_payment_rollup" (
    "day" DATE NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "amount_bob" INTEGER NOT NULL,
    "payment_count" INTEGER NOT NULL,

    CONSTRAINT "daily_payment_rollup_pkey" PRIMARY KEY ("day","payment_method_id")
);

CREATE TABLE "public"."daily_product_rollup" (
    "day" DATE NOT NULL,
    "variant_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "net_bob" INTEGER NOT NULL,
    "cogs_bob" INTEGER NOT NULL,

    CONSTRAINT "daily_product_rollup_pkey" PRIMARY KEY ("day","variant_id")
);
