-- CreateTable
CREATE TABLE "sta_finance_budget_commitments" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "budget_revision_id" UUID NOT NULL,
    "budget_line_id" UUID,
    "request_id" BIGINT NOT NULL,
    "request_item_key" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL DEFAULT 'reserved',
    "committed_amount" DECIMAL(15,2) NOT NULL,
    "actualized_amount" DECIMAL(15,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_budget_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_finance_budget_commitments_budget_id_status_idx" ON "sta_finance_budget_commitments"("budget_id", "status");

-- CreateIndex
CREATE INDEX "sta_finance_budget_commitments_request_id_idx" ON "sta_finance_budget_commitments"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_budget_commitments_request_id_budget_line_id_key" ON "sta_finance_budget_commitments"("request_id", "budget_line_id");

-- AddForeignKey
ALTER TABLE "sta_finance_budget_commitments" ADD CONSTRAINT "sta_finance_budget_commitments_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "sta_finance_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budget_commitments" ADD CONSTRAINT "sta_finance_budget_commitments_budget_revision_id_fkey" FOREIGN KEY ("budget_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budget_commitments" ADD CONSTRAINT "sta_finance_budget_commitments_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "sta_finance_budget_revision_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budget_commitments" ADD CONSTRAINT "sta_finance_budget_commitments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "sta_request_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
