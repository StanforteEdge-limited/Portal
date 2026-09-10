-- Add render_type column to taxonomies for specifying UI rendering mode (select vs tags)
ALTER TABLE "sta_taxonomies"
    ADD COLUMN "render_type" VARCHAR(20) NOT NULL DEFAULT 'select';
