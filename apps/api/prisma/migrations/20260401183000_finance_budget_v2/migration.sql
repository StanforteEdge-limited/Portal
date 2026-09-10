ALTER TABLE "sta_finance_funds"
  ADD COLUMN IF NOT EXISTS "project_id" BIGINT;

ALTER TABLE "sta_finance_grants"
  ADD COLUMN IF NOT EXISTS "project_id" BIGINT;

ALTER TABLE "sta_finance_budgets"
  ADD COLUMN IF NOT EXISTS "parent_budget_id" UUID,
  ADD COLUMN IF NOT EXISTS "scope_type" VARCHAR(30) NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS "period_type" VARCHAR(30) NOT NULL DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS "fiscal_year" INTEGER,
  ADD COLUMN IF NOT EXISTS "quarter" SMALLINT,
  ADD COLUMN IF NOT EXISTS "month" SMALLINT,
  ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS "approved_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

UPDATE "sta_finance_budgets"
SET "scope_type" = CASE
  WHEN "budget_type" IN ('organization', 'team', 'project') THEN "budget_type"
  WHEN "budget_type" IN ('fund', 'grant') THEN 'project'
  ELSE 'project'
END
WHERE "scope_type" IS NULL OR "scope_type" = '';

ALTER TABLE "sta_finance_budget_lines"
  ADD COLUMN IF NOT EXISTS "chart_account_id" UUID,
  ADD COLUMN IF NOT EXISTS "project_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "fund_id" UUID,
  ADD COLUMN IF NOT EXISTS "grant_id" UUID,
  ADD COLUMN IF NOT EXISTS "section" VARCHAR(20) NOT NULL DEFAULT 'expenditure',
  ADD COLUMN IF NOT EXISTS "group_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "period_1_amount" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "period_2_amount" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "period_3_amount" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "period_4_amount" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "total_amount" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "revised_total_amount" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "actual_total_amount" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "variance_amount" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

UPDATE "sta_finance_budget_lines"
SET "total_amount" = COALESCE("total_amount", "amount")
WHERE "total_amount" IS NULL;

CREATE TABLE IF NOT EXISTS "sta_finance_budget_assumptions" (
  "id" UUID NOT NULL,
  "budget_id" UUID NOT NULL,
  "section" VARCHAR(60),
  "label" VARCHAR(120) NOT NULL,
  "value" VARCHAR(255) NOT NULL,
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_finance_budget_assumptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sta_finance_budget_portfolio" (
  "id" UUID NOT NULL,
  "budget_id" UUID NOT NULL,
  "project_id" BIGINT NOT NULL,
  "fund_id" UUID,
  "grant_id" UUID,
  "funder_name" VARCHAR(180),
  "status" VARCHAR(40),
  "period_1_amount" DECIMAL(15,2),
  "period_2_amount" DECIMAL(15,2),
  "period_3_amount" DECIMAL(15,2),
  "period_4_amount" DECIMAL(15,2),
  "period_total" DECIMAL(15,2),
  "total_budget" DECIMAL(15,2),
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_finance_budget_portfolio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sta_finance_funds_project_id_idx" ON "sta_finance_funds"("project_id");
CREATE INDEX IF NOT EXISTS "sta_finance_grants_project_id_idx" ON "sta_finance_grants"("project_id");
CREATE INDEX IF NOT EXISTS "sta_finance_budgets_parent_budget_id_idx" ON "sta_finance_budgets"("parent_budget_id");
CREATE INDEX IF NOT EXISTS "sta_finance_budgets_scope_type_period_type_idx" ON "sta_finance_budgets"("scope_type", "period_type");
CREATE INDEX IF NOT EXISTS "sta_finance_budgets_fiscal_year_quarter_month_idx" ON "sta_finance_budgets"("fiscal_year", "quarter", "month");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_lines_chart_account_id_idx" ON "sta_finance_budget_lines"("chart_account_id");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_lines_project_id_idx" ON "sta_finance_budget_lines"("project_id");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_lines_fund_id_idx" ON "sta_finance_budget_lines"("fund_id");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_lines_grant_id_idx" ON "sta_finance_budget_lines"("grant_id");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_lines_section_idx" ON "sta_finance_budget_lines"("section");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_assumptions_budget_id_sort_order_idx" ON "sta_finance_budget_assumptions"("budget_id", "sort_order");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_portfolio_budget_id_sort_order_idx" ON "sta_finance_budget_portfolio"("budget_id", "sort_order");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_portfolio_project_id_idx" ON "sta_finance_budget_portfolio"("project_id");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_portfolio_fund_id_idx" ON "sta_finance_budget_portfolio"("fund_id");
CREATE INDEX IF NOT EXISTS "sta_finance_budget_portfolio_grant_id_idx" ON "sta_finance_budget_portfolio"("grant_id");

ALTER TABLE "sta_finance_budgets"
  ADD CONSTRAINT "sta_finance_budgets_parent_budget_id_fkey"
  FOREIGN KEY ("parent_budget_id") REFERENCES "sta_finance_budgets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_finance_budget_assumptions"
  ADD CONSTRAINT "sta_finance_budget_assumptions_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "sta_finance_budgets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_finance_budget_portfolio"
  ADD CONSTRAINT "sta_finance_budget_portfolio_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "sta_finance_budgets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
