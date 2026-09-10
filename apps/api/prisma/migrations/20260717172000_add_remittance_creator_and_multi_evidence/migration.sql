ALTER TABLE "sta_finance_request_deductions"
ADD COLUMN "remitted_by" BIGINT,
ADD COLUMN "evidence_file_ids" JSONB;

ALTER TABLE "sta_finance_request_deductions"
ADD CONSTRAINT "sta_finance_request_deductions_remitted_by_fkey"
FOREIGN KEY ("remitted_by") REFERENCES "sta_profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sta_finance_request_deductions_remitted_by_idx"
ON "sta_finance_request_deductions"("remitted_by");

UPDATE "sta_finance_request_deductions"
SET "evidence_file_ids" = CASE
  WHEN "evidence_file_id" IS NOT NULL THEN jsonb_build_array("evidence_file_id")
  ELSE NULL
END
WHERE "evidence_file_ids" IS NULL;
