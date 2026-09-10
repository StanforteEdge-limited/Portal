-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('weekly_task', 'daily_task', 'project_activity', 'recurring_responsibility', 'ad_hoc');

-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('planned', 'in_progress', 'completed', 'blocked', 'carried_over', 'cancelled');

-- CreateEnum
CREATE TYPE "WorkPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "WorkLogApprovalStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "sta_team_goals" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "owner_user_id" BIGINT,
    "created_by_id" BIGINT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "period_year" INTEGER NOT NULL,
    "period_type" VARCHAR(20) NOT NULL DEFAULT 'annual',
    "period_label" VARCHAR(80),
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "weight" DECIMAL(8,2),
    "start_date" DATE,
    "end_date" DATE,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_team_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_team_objectives" (
    "id" UUID NOT NULL,
    "goal_id" UUID,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "owner_user_id" BIGINT,
    "created_by_id" BIGINT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "weight" DECIMAL(8,2),
    "due_date" DATE,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_team_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_team_kpis" (
    "id" UUID NOT NULL,
    "goal_id" UUID,
    "objective_id" UUID,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "owner_user_id" BIGINT,
    "created_by_id" BIGINT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_type" VARCHAR(30),
    "target_value" DECIMAL(15,2),
    "unit_label" VARCHAR(50),
    "period_year" INTEGER,
    "quarter" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "weight" DECIMAL(8,2),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_team_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_work_items" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "item_type" "WorkItemType" NOT NULL DEFAULT 'weekly_task',
    "status" "WorkItemStatus" NOT NULL DEFAULT 'planned',
    "priority" "WorkPriority" NOT NULL DEFAULT 'medium',
    "organization_id" BIGINT,
    "owner_team_id" BIGINT,
    "secondary_team_id" BIGINT,
    "project_id" BIGINT,
    "fund_id" UUID,
    "grant_id" UUID,
    "goal_id" UUID,
    "objective_id" UUID,
    "kpi_id" UUID,
    "assigned_to_id" BIGINT,
    "assigned_by_id" BIGINT,
    "created_by_id" BIGINT,
    "planned_start_date" DATE,
    "due_date" DATE,
    "expected_hours" DECIMAL(10,2),
    "week_start_date" DATE,
    "is_staff_added" BOOLEAN NOT NULL DEFAULT false,
    "requires_manager_ack" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_work_logs" (
    "id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "staff_id" BIGINT NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "project_id" BIGINT,
    "fund_id" UUID,
    "grant_id" UUID,
    "log_date" DATE NOT NULL,
    "hours_spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "WorkItemStatus" NOT NULL DEFAULT 'in_progress',
    "progress_percent" DECIMAL(5,2),
    "note" TEXT,
    "blocker_note" TEXT,
    "carried_over" BOOLEAN NOT NULL DEFAULT false,
    "carry_over_to_date" DATE,
    "approval_status" "WorkLogApprovalStatus" NOT NULL DEFAULT 'draft',
    "approved_by_id" BIGINT,
    "approved_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_work_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sta_project_timesheet_entries" ADD COLUMN "source_work_log_id" UUID;

-- CreateIndex
CREATE INDEX "sta_work_items_assigned_to_id_status_idx" ON "sta_work_items"("assigned_to_id", "status");
CREATE INDEX "sta_work_items_owner_team_id_week_start_date_idx" ON "sta_work_items"("owner_team_id", "week_start_date");
CREATE INDEX "sta_work_items_project_id_idx" ON "sta_work_items"("project_id");
CREATE INDEX "sta_work_items_fund_id_idx" ON "sta_work_items"("fund_id");
CREATE INDEX "sta_work_items_grant_id_idx" ON "sta_work_items"("grant_id");
CREATE INDEX "sta_work_items_goal_id_idx" ON "sta_work_items"("goal_id");
CREATE INDEX "sta_work_items_objective_id_idx" ON "sta_work_items"("objective_id");
CREATE INDEX "sta_work_items_kpi_id_idx" ON "sta_work_items"("kpi_id");
CREATE INDEX "sta_work_logs_staff_id_log_date_idx" ON "sta_work_logs"("staff_id", "log_date");
CREATE INDEX "sta_work_logs_approval_status_log_date_idx" ON "sta_work_logs"("approval_status", "log_date");
CREATE INDEX "sta_work_logs_project_id_idx" ON "sta_work_logs"("project_id");
CREATE INDEX "sta_work_logs_fund_id_idx" ON "sta_work_logs"("fund_id");
CREATE INDEX "sta_work_logs_grant_id_idx" ON "sta_work_logs"("grant_id");
CREATE INDEX "sta_team_goals_team_id_period_year_idx" ON "sta_team_goals"("team_id", "period_year");
CREATE INDEX "sta_team_goals_organization_id_idx" ON "sta_team_goals"("organization_id");
CREATE INDEX "sta_team_objectives_goal_id_idx" ON "sta_team_objectives"("goal_id");
CREATE INDEX "sta_team_objectives_team_id_idx" ON "sta_team_objectives"("team_id");
CREATE INDEX "sta_team_kpis_goal_id_idx" ON "sta_team_kpis"("goal_id");
CREATE INDEX "sta_team_kpis_objective_id_idx" ON "sta_team_kpis"("objective_id");
CREATE INDEX "sta_team_kpis_team_id_period_year_quarter_idx" ON "sta_team_kpis"("team_id", "period_year", "quarter");
CREATE UNIQUE INDEX "sta_project_timesheet_entries_source_work_log_id_key" ON "sta_project_timesheet_entries"("source_work_log_id");
CREATE INDEX "sta_project_timesheet_entries_source_work_log_id_idx" ON "sta_project_timesheet_entries"("source_work_log_id");

-- AddForeignKey
ALTER TABLE "sta_team_goals" ADD CONSTRAINT "sta_team_goals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_goals" ADD CONSTRAINT "sta_team_goals_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_goals" ADD CONSTRAINT "sta_team_goals_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_goals" ADD CONSTRAINT "sta_team_goals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_objectives" ADD CONSTRAINT "sta_team_objectives_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "sta_team_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_objectives" ADD CONSTRAINT "sta_team_objectives_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_objectives" ADD CONSTRAINT "sta_team_objectives_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_objectives" ADD CONSTRAINT "sta_team_objectives_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_objectives" ADD CONSTRAINT "sta_team_objectives_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_kpis" ADD CONSTRAINT "sta_team_kpis_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "sta_team_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_kpis" ADD CONSTRAINT "sta_team_kpis_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "sta_team_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_kpis" ADD CONSTRAINT "sta_team_kpis_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_kpis" ADD CONSTRAINT "sta_team_kpis_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_kpis" ADD CONSTRAINT "sta_team_kpis_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_team_kpis" ADD CONSTRAINT "sta_team_kpis_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_owner_team_id_fkey" FOREIGN KEY ("owner_team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_secondary_team_id_fkey" FOREIGN KEY ("secondary_team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "sta_team_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "sta_team_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "sta_team_kpis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_items" ADD CONSTRAINT "sta_work_items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "sta_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_work_logs" ADD CONSTRAINT "sta_work_logs_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sta_project_timesheet_entries" ADD CONSTRAINT "sta_project_timesheet_entries_source_work_log_id_fkey" FOREIGN KEY ("source_work_log_id") REFERENCES "sta_work_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
