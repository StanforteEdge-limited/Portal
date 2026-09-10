-- CreateTable
CREATE TABLE "sta_finance_budgets" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "project_id" BIGINT,
    "fund_id" UUID,
    "grant_id" UUID,
    "name" VARCHAR(180) NOT NULL,
    "budget_type" VARCHAR(30) NOT NULL DEFAULT 'project',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "total_budget" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_budget_lines" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "line_label" VARCHAR(180) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_finance_budgets_organization_id_idx" ON "sta_finance_budgets"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_budgets_team_id_idx" ON "sta_finance_budgets"("team_id");

-- CreateIndex
CREATE INDEX "sta_finance_budgets_project_id_idx" ON "sta_finance_budgets"("project_id");

-- CreateIndex
CREATE INDEX "sta_finance_budgets_fund_id_idx" ON "sta_finance_budgets"("fund_id");

-- CreateIndex
CREATE INDEX "sta_finance_budgets_grant_id_idx" ON "sta_finance_budgets"("grant_id");

-- CreateIndex
CREATE INDEX "sta_finance_budgets_budget_type_status_idx" ON "sta_finance_budgets"("budget_type", "status");

-- CreateIndex
CREATE INDEX "sta_finance_budgets_start_date_end_date_idx" ON "sta_finance_budgets"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "sta_finance_budget_lines_budget_id_sort_order_idx" ON "sta_finance_budget_lines"("budget_id", "sort_order");

-- AddForeignKey
ALTER TABLE "sta_finance_budgets" ADD CONSTRAINT "sta_finance_budgets_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budgets" ADD CONSTRAINT "sta_finance_budgets_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_budget_lines" ADD CONSTRAINT "sta_finance_budget_lines_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "sta_finance_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
