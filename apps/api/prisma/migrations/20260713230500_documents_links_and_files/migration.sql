ALTER TABLE "sta_documents"
ADD COLUMN IF NOT EXISTS "file_id" UUID,
ADD COLUMN IF NOT EXISTS "link_url" VARCHAR(2048);

CREATE INDEX IF NOT EXISTS "sta_documents_file_id_idx"
ON "sta_documents" ("file_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'sta_documents_file_id_fkey'
      AND table_name = 'sta_documents'
  ) THEN
    ALTER TABLE "sta_documents"
    ADD CONSTRAINT "sta_documents_file_id_fkey"
    FOREIGN KEY ("file_id")
    REFERENCES "sta_file_assets"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
