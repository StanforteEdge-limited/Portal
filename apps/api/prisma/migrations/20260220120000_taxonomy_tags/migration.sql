-- Create tag assignments table backed by taxonomy terms
CREATE TABLE "sta_taxonomy_tag_assignments" (
  "id" UUID NOT NULL,
  "taxonomy_id" UUID NOT NULL,
  "term_id" UUID NOT NULL,
  "entity_type" VARCHAR(80) NOT NULL,
  "entity_id" VARCHAR(80) NOT NULL,
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sta_taxonomy_tag_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unique_taxonomy_entity_tag"
  ON "sta_taxonomy_tag_assignments"("taxonomy_id", "term_id", "entity_type", "entity_id");

CREATE INDEX "idx_taggable_entity"
  ON "sta_taxonomy_tag_assignments"("entity_type", "entity_id");

CREATE INDEX "idx_taggable_taxonomy_term"
  ON "sta_taxonomy_tag_assignments"("taxonomy_id", "term_id");

ALTER TABLE "sta_taxonomy_tag_assignments"
  ADD CONSTRAINT "sta_taxonomy_tag_assignments_taxonomy_id_fkey"
  FOREIGN KEY ("taxonomy_id") REFERENCES "sta_taxonomies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_taxonomy_tag_assignments"
  ADD CONSTRAINT "sta_taxonomy_tag_assignments_term_id_fkey"
  FOREIGN KEY ("term_id") REFERENCES "sta_taxonomy_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
