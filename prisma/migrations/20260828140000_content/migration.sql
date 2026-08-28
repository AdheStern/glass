-- Recrea BlockType con los 10 bloques de §11.1 (page_block está vacía)
ALTER TABLE "page_block" ALTER COLUMN "type" TYPE TEXT;
DROP TYPE "BlockType";
CREATE TYPE "BlockType" AS ENUM (
  'HERO', 'BENTO', 'PRODUCT_GRID', 'TEXT_MEDIA', 'GALLERY',
  'TESTIMONIALS', 'FAQ', 'MAP_CONTACT', 'CTA_WHATSAPP', 'POSTS'
);
ALTER TABLE "page_block"
  ALTER COLUMN "type" TYPE "BlockType" USING "type"::"BlockType";

-- Page: portada por bloques (§8) + vista previa por testigo (§11.3)
ALTER TABLE "page"
  ADD COLUMN "is_home" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "draft_token" TEXT;
CREATE UNIQUE INDEX "page_draft_token_key" ON "page"("draft_token");
-- Una sola portada
CREATE UNIQUE INDEX "page_is_home_key" ON "page"("is_home") WHERE "is_home";

-- Post: autor, etiquetas, testigo de borrador (§11.2)
ALTER TABLE "post"
  ADD COLUMN "author_name" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "draft_token" TEXT;
CREATE UNIQUE INDEX "post_draft_token_key" ON "post"("draft_token");
