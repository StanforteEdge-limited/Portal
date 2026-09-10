-- CreateTable
CREATE TABLE "sta_finance_request_deductions" (
    "id" UUID NOT NULL,
    "request_id" BIGINT NOT NULL,
    "deduction_type_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "gross_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "remitted_at" TIMESTAMP(3),
    "remittance_ref" VARCHAR(255),
    "notes" TEXT,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_request_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_finance_request_deductions_request_id_idx" ON "sta_finance_request_deductions"("request_id");

-- CreateIndex
CREATE INDEX "sta_finance_request_deductions_status_idx" ON "sta_finance_request_deductions"("status");

-- CreateIndex
CREATE INDEX "sta_finance_request_deductions_deduction_type_id_idx" ON "sta_finance_request_deductions"("deduction_type_id");

-- AddForeignKey
ALTER TABLE "sta_finance_request_deductions" ADD CONSTRAINT "sta_finance_request_deductions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "sta_request_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_request_deductions" ADD CONSTRAINT "sta_finance_request_deductions_deduction_type_id_fkey" FOREIGN KEY ("deduction_type_id") REFERENCES "sta_finance_deduction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_request_deductions" ADD CONSTRAINT "sta_finance_request_deductions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
