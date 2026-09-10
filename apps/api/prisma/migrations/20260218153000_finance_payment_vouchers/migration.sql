-- CreateTable
CREATE TABLE "sta_finance_payment_vouchers" (
  "id" UUID NOT NULL,
  "request_id" BIGINT NOT NULL,
  "voucher_number" VARCHAR(60) NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "retired_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "retirement_status" VARCHAR(20) NOT NULL DEFAULT 'not_retired',
  "method" VARCHAR(40),
  "transaction_ref" VARCHAR(120),
  "note" TEXT,
  "evidence_file_id" UUID,
  "disbursed_at" TIMESTAMP(3) NOT NULL,
  "retired_at" TIMESTAMP(3),
  "verified_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sta_finance_payment_vouchers_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "sta_finance_payment_vouchers_request_id_idx" ON "sta_finance_payment_vouchers"("request_id");
CREATE INDEX "sta_finance_payment_vouchers_voucher_number_idx" ON "sta_finance_payment_vouchers"("voucher_number");
CREATE INDEX "sta_finance_payment_vouchers_retirement_status_idx" ON "sta_finance_payment_vouchers"("retirement_status");

-- Foreign Keys
ALTER TABLE "sta_finance_payment_vouchers"
ADD CONSTRAINT "sta_finance_payment_vouchers_request_id_fkey"
FOREIGN KEY ("request_id") REFERENCES "sta_request_instances"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_payment_vouchers"
ADD CONSTRAINT "sta_finance_payment_vouchers_evidence_file_id_fkey"
FOREIGN KEY ("evidence_file_id") REFERENCES "sta_file_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
