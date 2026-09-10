CREATE TABLE IF NOT EXISTS "sta_procurement_attachments" (
  "id" UUID NOT NULL,
  "case_id" UUID,
  "order_id" UUID,
  "file_id" UUID NOT NULL,
  "label" VARCHAR(150),
  "visibility" VARCHAR(20) NOT NULL DEFAULT 'internal',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sta_procurement_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sta_procurement_attachments_case_id_idx"
ON "sta_procurement_attachments"("case_id");

CREATE INDEX IF NOT EXISTS "sta_procurement_attachments_order_id_idx"
ON "sta_procurement_attachments"("order_id");

CREATE INDEX IF NOT EXISTS "sta_procurement_attachments_file_id_idx"
ON "sta_procurement_attachments"("file_id");

CREATE INDEX IF NOT EXISTS "sta_procurement_attachments_visibility_idx"
ON "sta_procurement_attachments"("visibility");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sta_procurement_attachments_case_id_fkey'
  ) THEN
    ALTER TABLE "sta_procurement_attachments"
    ADD CONSTRAINT "sta_procurement_attachments_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "sta_procurement_cases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sta_procurement_attachments_order_id_fkey'
  ) THEN
    ALTER TABLE "sta_procurement_attachments"
    ADD CONSTRAINT "sta_procurement_attachments_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "sta_procurement_orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sta_procurement_attachments_file_id_fkey'
  ) THEN
    ALTER TABLE "sta_procurement_attachments"
    ADD CONSTRAINT "sta_procurement_attachments_file_id_fkey"
    FOREIGN KEY ("file_id") REFERENCES "sta_file_assets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
