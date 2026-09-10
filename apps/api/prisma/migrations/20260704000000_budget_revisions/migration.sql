-- Add revision columns to sta_finance_budgets
ALTER TABLE "sta_finance_budgets" ADD COLUMN IF NOT EXISTS "current_active_revision_id" UUID;
ALTER TABLE "sta_finance_budgets" ADD COLUMN IF NOT EXISTS "draft_revision_id" UUID;
ALTER TABLE "sta_finance_budgets" ADD COLUMN IF NOT EXISTS "owner_type" VARCHAR(30);
ALTER TABLE "sta_finance_budgets" ADD COLUMN IF NOT EXISTS "owner_id" BIGINT;
ALTER TABLE "sta_finance_budgets" ADD COLUMN IF NOT EXISTS "prepared_by" BIGINT;

-- Create sta_finance_budget_revisions table
CREATE TABLE IF NOT EXISTS "sta_finance_budget_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "submission_note" TEXT,
    "justification" TEXT,
    "material_change_summary" TEXT,
    "copied_from_revision_id" UUID,
    "submitted_by" BIGINT,
    "submitted_at" TIMESTAMPTZ,
    "approved_by" BIGINT,
    "approved_at" TIMESTAMPTZ,
    "workflow_instance_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "sta_finance_budget_revisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sta_finance_budget_revisions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "sta_finance_budgets"("id") ON DELETE CASCADE,
    CONSTRAINT "sta_finance_budget_revisions_copied_from_revision_id_fkey" FOREIGN KEY ("copied_from_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE SET NULL,
    CONSTRAINT "sta_finance_budget_revisions_budget_id_revision_number_key" UNIQUE ("budget_id", "revision_number")
);

CREATE INDEX IF NOT EXISTS "sta_finance_budget_revisions_budget_id_status_idx" ON "sta_finance_budget_revisions"("budget_id", "status");

-- Create sta_finance_budget_revision_lines table
CREATE TABLE IF NOT EXISTS "sta_finance_budget_revision_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_revision_id" UUID NOT NULL,
    "chart_account_id" UUID,
    "project_id" BIGINT,
    "fund_id" UUID,
    "grant_id" UUID,
    "section" VARCHAR(20) NOT NULL DEFAULT 'expenditure',
    "group_name" VARCHAR(120),
    "line_label" VARCHAR(180) NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "period_1_amount" DECIMAL(15, 2),
    "period_2_amount" DECIMAL(15, 2),
    "period_3_amount" DECIMAL(15, 2),
    "period_4_amount" DECIMAL(15, 2),
    "total_amount" DECIMAL(15, 2),
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "sta_finance_budget_revision_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sta_finance_budget_revision_lines_budget_revision_id_fkey" FOREIGN KEY ("budget_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "sta_finance_budget_revision_lines_budget_revision_id_sort_order_idx" ON "sta_finance_budget_revision_lines"("budget_revision_id", "sort_order");

-- Add revision foreign keys to sta_finance_budgets
ALTER TABLE "sta_finance_budgets" ADD CONSTRAINT "sta_finance_budgets_current_active_revision_id_fkey" FOREIGN KEY ("current_active_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE SET NULL;
ALTER TABLE "sta_finance_budgets" ADD CONSTRAINT "sta_finance_budgets_draft_revision_id_fkey" FOREIGN KEY ("draft_revision_id") REFERENCES "sta_finance_budget_revisions"("id") ON DELETE SET NULL;
