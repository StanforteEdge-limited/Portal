-- CreateTable
CREATE TABLE "sta_taxonomies" (
  "id" UUID NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "module" VARCHAR(50),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sta_taxonomies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_taxonomy_terms" (
  "id" UUID NOT NULL,
  "taxonomy_id" UUID NOT NULL,
  "value" VARCHAR(120) NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sta_taxonomy_terms_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "sta_taxonomies_key_key" ON "sta_taxonomies"("key");
CREATE UNIQUE INDEX "unique_taxonomy_term_value" ON "sta_taxonomy_terms"("taxonomy_id", "value");
CREATE INDEX "sta_taxonomy_terms_taxonomy_id_is_active_idx" ON "sta_taxonomy_terms"("taxonomy_id", "is_active");

-- FKs
ALTER TABLE "sta_taxonomy_terms"
ADD CONSTRAINT "sta_taxonomy_terms_taxonomy_id_fkey"
FOREIGN KEY ("taxonomy_id") REFERENCES "sta_taxonomies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
