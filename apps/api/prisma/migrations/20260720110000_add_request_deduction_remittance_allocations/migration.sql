CREATE TABLE "sta_finance_request_deduction_remittance_allocations" (
  "id" UUID NOT NULL,
  "request_deduction_id" UUID NOT NULL,
  "remittance_number" VARCHAR(60) NOT NULL,
  "remittance_ref" VARCHAR(255),
  "allocated_amount" DECIMAL(15,2) NOT NULL,
  "remitted_at" TIMESTAMP(3),
  "payment_voucher_id" UUID,
  "remitted_by" BIGINT,
  "paid_from_account_id" UUID,
  "evidence_file_id" UUID,
  "evidence_file_ids" JSONB,
  "notes" TEXT,
  "created_by" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sta_finance_request_deduction_remittance_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "frdra_request_deduction_id_idx"
ON "sta_finance_request_deduction_remittance_allocations"("request_deduction_id");

CREATE INDEX "frdra_remittance_number_idx"
ON "sta_finance_request_deduction_remittance_allocations"("remittance_number");

CREATE INDEX "frdra_remittance_ref_idx"
ON "sta_finance_request_deduction_remittance_allocations"("remittance_ref");

CREATE INDEX "frdra_payment_voucher_id_idx"
ON "sta_finance_request_deduction_remittance_allocations"("payment_voucher_id");

CREATE INDEX "frdra_remitted_by_idx"
ON "sta_finance_request_deduction_remittance_allocations"("remitted_by");

ALTER TABLE "sta_finance_request_deduction_remittance_allocations"
ADD CONSTRAINT "sta_finance_request_deduction_remittance_allocations_request_deduction_id_fkey"
FOREIGN KEY ("request_deduction_id") REFERENCES "sta_finance_request_deductions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_deduction_remittance_allocations"
ADD CONSTRAINT "sta_finance_request_deduction_remittance_allocations_payment_voucher_id_fkey"
FOREIGN KEY ("payment_voucher_id") REFERENCES "sta_finance_payment_vouchers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_deduction_remittance_allocations"
ADD CONSTRAINT "sta_finance_request_deduction_remittance_allocations_remitted_by_fkey"
FOREIGN KEY ("remitted_by") REFERENCES "sta_profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_deduction_remittance_allocations"
ADD CONSTRAINT "sta_finance_request_deduction_remittance_allocations_paid_from_account_id_fkey"
FOREIGN KEY ("paid_from_account_id") REFERENCES "sta_finance_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_deduction_remittance_allocations"
ADD CONSTRAINT "sta_finance_request_deduction_remittance_allocations_evidence_file_id_fkey"
FOREIGN KEY ("evidence_file_id") REFERENCES "sta_file_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_request_deduction_remittance_allocations"
ADD CONSTRAINT "sta_finance_request_deduction_remittance_allocations_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
