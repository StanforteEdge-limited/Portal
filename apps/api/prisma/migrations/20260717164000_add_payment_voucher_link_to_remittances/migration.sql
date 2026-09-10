ALTER TABLE "sta_finance_request_deductions"
ADD COLUMN "payment_voucher_id" UUID;

ALTER TABLE "sta_finance_request_deductions"
ADD CONSTRAINT "sta_finance_request_deductions_payment_voucher_id_fkey"
FOREIGN KEY ("payment_voucher_id") REFERENCES "sta_finance_payment_vouchers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sta_finance_request_deductions_payment_voucher_id_idx"
ON "sta_finance_request_deductions"("payment_voucher_id");

UPDATE "sta_finance_request_deductions" rd
SET "payment_voucher_id" = pvd."payment_voucher_id"
FROM "sta_finance_pv_deductions" pvd
WHERE pvd."request_deduction_id" = rd."id"
  AND rd."payment_voucher_id" IS NULL;
