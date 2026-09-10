CREATE TABLE "sta_finance_payment_voucher_corrections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "voucher_id" UUID NOT NULL,
  "request_id" BIGINT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "reason" TEXT,
  "current_snapshot" JSONB NOT NULL,
  "proposed_snapshot" JSONB NOT NULL,
  "proposed_by" BIGINT NOT NULL,
  "reviewed_by" BIGINT,
  "reviewed_at" TIMESTAMP(3),
  "review_comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sta_finance_payment_voucher_corrections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_finance_payment_voucher_corrections_voucher_id_status_idx"
  ON "sta_finance_payment_voucher_corrections"("voucher_id", "status");
CREATE INDEX "sta_finance_payment_voucher_corrections_request_id_status_idx"
  ON "sta_finance_payment_voucher_corrections"("request_id", "status");
CREATE INDEX "sta_finance_payment_voucher_corrections_proposed_by_idx"
  ON "sta_finance_payment_voucher_corrections"("proposed_by");
CREATE INDEX "sta_finance_payment_voucher_corrections_reviewed_by_idx"
  ON "sta_finance_payment_voucher_corrections"("reviewed_by");

ALTER TABLE "sta_finance_payment_voucher_corrections"
  ADD CONSTRAINT "sta_finance_payment_voucher_corrections_voucher_id_fkey"
  FOREIGN KEY ("voucher_id") REFERENCES "sta_finance_payment_vouchers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_payment_voucher_corrections"
  ADD CONSTRAINT "sta_finance_payment_voucher_corrections_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "sta_request_instances"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_payment_voucher_corrections"
  ADD CONSTRAINT "sta_finance_payment_voucher_corrections_proposed_by_fkey"
  FOREIGN KEY ("proposed_by") REFERENCES "sta_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_payment_voucher_corrections"
  ADD CONSTRAINT "sta_finance_payment_voucher_corrections_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "sta_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
