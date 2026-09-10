-- AlterTable
ALTER TABLE "sta_finance_request_deductions" ADD COLUMN     "evidence_file_id" UUID,
ADD COLUMN     "paid_from_account_id" UUID,
ADD COLUMN     "remittance_number" VARCHAR(60);

-- CreateIndex
CREATE INDEX "sta_finance_request_deductions_remittance_number_idx" ON "sta_finance_request_deductions"("remittance_number");

-- AddForeignKey
ALTER TABLE "sta_finance_request_deductions" ADD CONSTRAINT "sta_finance_request_deductions_paid_from_account_id_fkey" FOREIGN KEY ("paid_from_account_id") REFERENCES "sta_finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_request_deductions" ADD CONSTRAINT "sta_finance_request_deductions_evidence_file_id_fkey" FOREIGN KEY ("evidence_file_id") REFERENCES "sta_file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
