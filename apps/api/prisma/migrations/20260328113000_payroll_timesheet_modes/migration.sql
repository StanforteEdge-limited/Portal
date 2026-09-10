ALTER TABLE "sta_payroll_workers"
  ADD COLUMN "pay_basis" VARCHAR(30) NOT NULL DEFAULT 'monthly_fixed',
  ADD COLUMN "allocation_mode" VARCHAR(20) NOT NULL DEFAULT 'fixed',
  ADD COLUMN "hybrid_fixed_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN "standard_hours_per_day" DECIMAL(8,2) NOT NULL DEFAULT 8;

ALTER TABLE "sta_payroll_run_items"
  ADD COLUMN "pay_basis" VARCHAR(30) NOT NULL DEFAULT 'monthly_fixed',
  ADD COLUMN "allocation_source" VARCHAR(30) NOT NULL DEFAULT 'fixed',
  ADD COLUMN "computed_net_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "actual_net_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "net_adjustment_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "net_adjustment_reason" TEXT;

UPDATE "sta_payroll_run_items"
SET
  "computed_net_pay" = COALESCE("net_pay", 0),
  "actual_net_pay" = COALESCE("net_pay", 0),
  "net_adjustment_amount" = 0,
  "pay_basis" = 'monthly_fixed',
  "allocation_source" = 'fixed';

CREATE TABLE "sta_payroll_run_timesheet_allocations" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "worker_id" UUID NOT NULL,
  "organization_id" BIGINT,
  "team_id" BIGINT,
  "project_id" BIGINT,
  "fund_id" UUID,
  "grant_id" UUID,
  "hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "allocation_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_payroll_run_timesheet_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_payroll_run_timesheet_allocations_run_id_worker_id_sort_order_idx"
ON "sta_payroll_run_timesheet_allocations"("run_id", "worker_id", "sort_order");

CREATE INDEX "sta_payroll_run_timesheet_allocations_organization_id_idx"
ON "sta_payroll_run_timesheet_allocations"("organization_id");

CREATE INDEX "sta_payroll_run_timesheet_allocations_team_id_idx"
ON "sta_payroll_run_timesheet_allocations"("team_id");

CREATE INDEX "sta_payroll_run_timesheet_allocations_project_id_idx"
ON "sta_payroll_run_timesheet_allocations"("project_id");

CREATE INDEX "sta_payroll_run_timesheet_allocations_fund_id_idx"
ON "sta_payroll_run_timesheet_allocations"("fund_id");

CREATE INDEX "sta_payroll_run_timesheet_allocations_grant_id_idx"
ON "sta_payroll_run_timesheet_allocations"("grant_id");

ALTER TABLE "sta_payroll_run_timesheet_allocations"
  ADD CONSTRAINT "sta_payroll_run_timesheet_allocations_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "sta_payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_run_timesheet_allocations"
  ADD CONSTRAINT "sta_payroll_run_timesheet_allocations_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "sta_payroll_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_run_timesheet_allocations"
  ADD CONSTRAINT "sta_payroll_run_timesheet_allocations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_run_timesheet_allocations"
  ADD CONSTRAINT "sta_payroll_run_timesheet_allocations_fund_id_fkey"
  FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_run_timesheet_allocations"
  ADD CONSTRAINT "sta_payroll_run_timesheet_allocations_grant_id_fkey"
  FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
