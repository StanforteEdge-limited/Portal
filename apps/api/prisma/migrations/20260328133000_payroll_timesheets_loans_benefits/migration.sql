ALTER TABLE "sta_payroll_components"
  ADD COLUMN "paid_by" VARCHAR(20) NOT NULL DEFAULT 'employee',
  ADD COLUMN "employer_share_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN "affects_net_pay" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "sta_payroll_loans" (
  "id" UUID NOT NULL,
  "worker_id" UUID NOT NULL,
  "component_id" UUID,
  "loan_type" VARCHAR(20) NOT NULL DEFAULT 'loan',
  "title" VARCHAR(180) NOT NULL,
  "principal_amount" DECIMAL(15,2) NOT NULL,
  "outstanding_amount" DECIMAL(15,2) NOT NULL,
  "issued_date" DATE NOT NULL,
  "start_recovery_date" DATE NOT NULL,
  "monthly_recovery_amount" DECIMAL(15,2),
  "recovery_rate" DECIMAL(8,4),
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_payroll_loans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sta_payroll_loan_repayments" (
  "id" UUID NOT NULL,
  "loan_id" UUID NOT NULL,
  "run_id" UUID,
  "run_item_id" UUID,
  "amount" DECIMAL(15,2) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'posted',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_payroll_loan_repayments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sta_project_timesheet_entries" (
  "id" UUID NOT NULL,
  "worker_id" UUID NOT NULL,
  "component_id" UUID,
  "organization_id" BIGINT,
  "team_id" BIGINT,
  "project_id" BIGINT,
  "fund_id" UUID,
  "grant_id" UUID,
  "synced_run_id" UUID,
  "work_date" DATE NOT NULL,
  "hours" DECIMAL(10,2) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "approved_by" BIGINT,
  "approved_at" TIMESTAMP(3),
  "created_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sta_project_timesheet_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_payroll_loans_worker_id_status_idx" ON "sta_payroll_loans"("worker_id", "status");
CREATE INDEX "sta_payroll_loans_component_id_idx" ON "sta_payroll_loans"("component_id");
CREATE INDEX "sta_payroll_loan_repayments_loan_id_idx" ON "sta_payroll_loan_repayments"("loan_id");
CREATE INDEX "sta_payroll_loan_repayments_run_id_idx" ON "sta_payroll_loan_repayments"("run_id");
CREATE INDEX "sta_payroll_loan_repayments_run_item_id_idx" ON "sta_payroll_loan_repayments"("run_item_id");
CREATE INDEX "sta_project_timesheet_entries_worker_id_work_date_idx" ON "sta_project_timesheet_entries"("worker_id", "work_date");
CREATE INDEX "sta_project_timesheet_entries_project_id_idx" ON "sta_project_timesheet_entries"("project_id");
CREATE INDEX "sta_project_timesheet_entries_fund_id_idx" ON "sta_project_timesheet_entries"("fund_id");
CREATE INDEX "sta_project_timesheet_entries_grant_id_idx" ON "sta_project_timesheet_entries"("grant_id");
CREATE INDEX "sta_project_timesheet_entries_status_idx" ON "sta_project_timesheet_entries"("status");
CREATE INDEX "sta_project_timesheet_entries_synced_run_id_idx" ON "sta_project_timesheet_entries"("synced_run_id");

ALTER TABLE "sta_payroll_loans"
  ADD CONSTRAINT "sta_payroll_loans_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "sta_payroll_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_payroll_loans_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "sta_payroll_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_payroll_loan_repayments"
  ADD CONSTRAINT "sta_payroll_loan_repayments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "sta_payroll_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_payroll_loan_repayments_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "sta_payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_payroll_loan_repayments_run_item_id_fkey" FOREIGN KEY ("run_item_id") REFERENCES "sta_payroll_run_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_project_timesheet_entries"
  ADD CONSTRAINT "sta_project_timesheet_entries_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "sta_payroll_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_project_timesheet_entries_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "sta_payroll_components"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_project_timesheet_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_project_timesheet_entries_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_project_timesheet_entries_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_project_timesheet_entries_synced_run_id_fkey" FOREIGN KEY ("synced_run_id") REFERENCES "sta_payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_project_timesheet_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sta_project_timesheet_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
