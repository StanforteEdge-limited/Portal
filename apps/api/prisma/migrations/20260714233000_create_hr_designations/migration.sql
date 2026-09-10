CREATE TABLE IF NOT EXISTS "sta_hr_designations" (
  "id" BIGSERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(20),
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "document_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "sta_hr_designations_name_key"
ON "sta_hr_designations" ("name");

CREATE UNIQUE INDEX IF NOT EXISTS "sta_hr_designations_code_key"
ON "sta_hr_designations" ("code");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sta_hr_designations_document_id_fkey'
  ) THEN
    ALTER TABLE "sta_hr_designations"
    ADD CONSTRAINT "sta_hr_designations_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "sta_documents"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
