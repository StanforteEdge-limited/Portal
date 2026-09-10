CREATE TABLE IF NOT EXISTS "sta_finance_request_remittances" (
  "id" UUID NOT NULL,
  "remittance_number" VARCHAR(60) NOT NULL,
  "reference" VARCHAR(255),
  "total_amount" DECIMAL(15,2) NOT NULL,
  "remitted_at" TIMESTAMP(3),
  "payment_voucher_id" UUID,
  "remitted_by" BIGINT,
  "paid_from_account_id" UUID,
  "evidence_file_id" UUID,
  "evidence_file_ids" JSONB,
  "notes" TEXT,
  "created_by" BIGINT NOT NULL,
  "updated_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_finance_request_remittances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sta_finance_request_remittances_remittance_number_key"
ON "sta_finance_request_remittances"("remittance_number");

CREATE INDEX IF NOT EXISTS "sta_finance_request_remittances_reference_idx"
ON "sta_finance_request_remittances"("reference");

CREATE INDEX IF NOT EXISTS "sta_finance_request_remittances_payment_voucher_id_idx"
ON "sta_finance_request_remittances"("payment_voucher_id");

CREATE INDEX IF NOT EXISTS "sta_finance_request_remittances_remitted_by_idx"
ON "sta_finance_request_remittances"("remitted_by");

ALTER TABLE "sta_finance_request_remittances"
  ADD CONSTRAINT "sta_finance_request_remittances_payment_voucher_id_fkey"
  FOREIGN KEY ("payment_voucher_id") REFERENCES "sta_finance_payment_vouchers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_remittances"
  ADD CONSTRAINT "sta_finance_request_remittances_remitted_by_fkey"
  FOREIGN KEY ("remitted_by") REFERENCES "sta_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_remittances"
  ADD CONSTRAINT "sta_finance_request_remittances_paid_from_account_id_fkey"
  FOREIGN KEY ("paid_from_account_id") REFERENCES "sta_finance_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_remittances"
  ADD CONSTRAINT "sta_finance_request_remittances_evidence_file_id_fkey"
  FOREIGN KEY ("evidence_file_id") REFERENCES "sta_file_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_remittances"
  ADD CONSTRAINT "sta_finance_request_remittances_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_remittances"
  ADD CONSTRAINT "sta_finance_request_remittances_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_deduction_remittance_allocations"
  ADD COLUMN IF NOT EXISTS "request_remittance_id" UUID;

CREATE INDEX IF NOT EXISTS "frdra_request_remittance_id_idx"
ON "sta_finance_request_deduction_remittance_allocations"("request_remittance_id");

ALTER TABLE "sta_finance_request_deduction_remittance_allocations"
  ADD CONSTRAINT "frdra_request_remittance_fkey"
  FOREIGN KEY ("request_remittance_id") REFERENCES "sta_finance_request_remittances"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "sta_finance_request_remittances" (
  "id",
  "remittance_number",
  "reference",
  "total_amount",
  "remitted_at",
  "payment_voucher_id",
  "remitted_by",
  "paid_from_account_id",
  "evidence_file_id",
  "evidence_file_ids",
  "notes",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  alloc."remittance_number",
  alloc."remittance_ref",
  COALESCE(SUM(alloc."allocated_amount"), 0),
  alloc."remitted_at",
  alloc."payment_voucher_id",
  alloc."remitted_by",
  alloc."paid_from_account_id",
  alloc."evidence_file_id",
  alloc."evidence_file_ids",
  alloc."notes",
  MIN(alloc."created_by") AS "created_by",
  NULL::BIGINT AS "updated_by",
  MIN(alloc."created_at") AS "created_at",
  MAX(alloc."updated_at") AS "updated_at"
FROM "sta_finance_request_deduction_remittance_allocations" alloc
LEFT JOIN "sta_finance_request_remittances" existing
  ON existing."remittance_number" = alloc."remittance_number"
WHERE alloc."request_remittance_id" IS NULL
  AND existing."id" IS NULL
GROUP BY
  alloc."remittance_number",
  alloc."remittance_ref",
  alloc."remitted_at",
  alloc."payment_voucher_id",
  alloc."remitted_by",
  alloc."paid_from_account_id",
  alloc."evidence_file_id",
  alloc."evidence_file_ids",
  alloc."notes";

UPDATE "sta_finance_request_deduction_remittance_allocations" alloc
SET "request_remittance_id" = rem."id"
FROM "sta_finance_request_remittances" rem
WHERE alloc."request_remittance_id" IS NULL
  AND rem."remittance_number" = alloc."remittance_number"
  AND COALESCE(rem."reference", '') = COALESCE(alloc."remittance_ref", '')
  AND COALESCE(rem."payment_voucher_id"::text, '') = COALESCE(alloc."payment_voucher_id"::text, '')
  AND COALESCE(rem."remitted_by"::text, '') = COALESCE(alloc."remitted_by"::text, '')
  AND COALESCE(rem."paid_from_account_id"::text, '') = COALESCE(alloc."paid_from_account_id"::text, '');
