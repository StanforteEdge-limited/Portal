import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

export const projectTimesheetEntry = pgTable("sta_project_timesheet_entries", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  sourceWorkLogId: uuid("source_work_log_id").unique(),
  workerId: uuid("worker_id").notNull(),
  componentId: uuid("component_id"),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  syncedRunId: uuid("synced_run_id"),
  workDate: date("work_date", { mode: 'date' }).notNull(),
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  approvedBy: bigint("approved_by", { mode: 'bigint' }),
  approvedAt: timestamp("approved_at", { mode: 'date', precision: 6 }),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("projectTimesheetEntry_index_workerId_workDate").on(table.workerId, table.workDate),
    index("projectTimesheetEntry_index_projectId").on(table.projectId),
    index("projectTimesheetEntry_index_fundId").on(table.fundId),
    index("projectTimesheetEntry_index_grantId").on(table.grantId),
    index("projectTimesheetEntry_index_status").on(table.status),
    index("projectTimesheetEntry_index_syncedRunId").on(table.syncedRunId),
    index("projectTimesheetEntry_index_sourceWorkLogId").on(table.sourceWorkLogId),
]);

export type ProjectTimesheetEntry = typeof projectTimesheetEntry.$inferSelect;
export type NewProjectTimesheetEntry = typeof projectTimesheetEntry.$inferInsert;

export const teamGoal = pgTable("sta_team_goals", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  ownerUserId: bigint("owner_user_id", { mode: 'bigint' }),
  createdById: bigint("created_by_id", { mode: 'bigint' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  periodYear: integer("period_year").notNull(),
  periodType: varchar("period_type", { length: 20 }).default("annual").notNull(),
  periodLabel: varchar("period_label", { length: 80 }),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  startDate: date("start_date", { mode: 'date' }),
  endDate: date("end_date", { mode: 'date' }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("teamGoal_index_teamId_periodYear").on(table.teamId, table.periodYear),
    index("teamGoal_index_organizationId").on(table.organizationId),
]);

export type TeamGoal = typeof teamGoal.$inferSelect;
export type NewTeamGoal = typeof teamGoal.$inferInsert;

export const teamObjective = pgTable("sta_team_objectives", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  goalId: uuid("goal_id"),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  ownerUserId: bigint("owner_user_id", { mode: 'bigint' }),
  createdById: bigint("created_by_id", { mode: 'bigint' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  dueDate: date("due_date", { mode: 'date' }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("teamObjective_index_goalId").on(table.goalId),
    index("teamObjective_index_teamId").on(table.teamId),
]);

export type TeamObjective = typeof teamObjective.$inferSelect;
export type NewTeamObjective = typeof teamObjective.$inferInsert;

export const teamKpi = pgTable("sta_team_kpis", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  goalId: uuid("goal_id"),
  objectiveId: uuid("objective_id"),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  ownerUserId: bigint("owner_user_id", { mode: 'bigint' }),
  createdById: bigint("created_by_id", { mode: 'bigint' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetType: varchar("target_type", { length: 30 }),
  targetValue: numeric("target_value", { precision: 15, scale: 2 }),
  unitLabel: varchar("unit_label", { length: 50 }),
  periodYear: integer("period_year"),
  quarter: integer("quarter"),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("teamKpi_index_goalId").on(table.goalId),
    index("teamKpi_index_objectiveId").on(table.objectiveId),
    index("teamKpi_index_teamId_periodYear_quarter").on(table.teamId, table.periodYear, table.quarter),
]);

export type TeamKpi = typeof teamKpi.$inferSelect;
export type NewTeamKpi = typeof teamKpi.$inferInsert;

export const workItem = pgTable("sta_work_items", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  itemType: workItemTypeEnum("item_type").default("weekly_task").notNull(),
  status: workItemStatusEnum("status").default("planned").notNull(),
  priority: workPriorityEnum("priority").default("medium").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  ownerTeamId: bigint("owner_team_id", { mode: 'bigint' }),
  secondaryTeamId: bigint("secondary_team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  goalId: uuid("goal_id"),
  objectiveId: uuid("objective_id"),
  kpiId: uuid("kpi_id"),
  assignedToId: bigint("assigned_to_id", { mode: 'bigint' }),
  assignedById: bigint("assigned_by_id", { mode: 'bigint' }),
  createdById: bigint("created_by_id", { mode: 'bigint' }),
  plannedStartDate: date("planned_start_date", { mode: 'date' }),
  dueDate: date("due_date", { mode: 'date' }),
  expectedHours: numeric("expected_hours", { precision: 10, scale: 2 }),
  weekStartDate: date("week_start_date", { mode: 'date' }),
  isStaffAdded: boolean("is_staff_added").default(false).notNull(),
  requiresManagerAck: boolean("requires_manager_ack").default(false).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workItem_index_assignedToId_status").on(table.assignedToId, table.status),
    index("workItem_index_ownerTeamId_weekStartDate").on(table.ownerTeamId, table.weekStartDate),
    index("workItem_index_projectId").on(table.projectId),
    index("workItem_index_fundId").on(table.fundId),
    index("workItem_index_grantId").on(table.grantId),
    index("workItem_index_goalId").on(table.goalId),
    index("workItem_index_objectiveId").on(table.objectiveId),
    index("workItem_index_kpiId").on(table.kpiId),
]);

export type WorkItem = typeof workItem.$inferSelect;
export type NewWorkItem = typeof workItem.$inferInsert;

export const workLog = pgTable("sta_work_logs", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  workItemId: uuid("work_item_id").notNull(),
  staffId: bigint("staff_id", { mode: 'bigint' }).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  logDate: date("log_date", { mode: 'date' }).notNull(),
  hoursSpent: numeric("hours_spent", { precision: 10, scale: 2 }).default("0").notNull(),
  status: workItemStatusEnum("status").default("in_progress").notNull(),
  progressPercent: numeric("progress_percent", { precision: 5, scale: 2 }),
  note: text("note"),
  blockerNote: text("blocker_note"),
  carriedOver: boolean("carried_over").default(false).notNull(),
  carryOverToDate: date("carry_over_to_date", { mode: 'date' }),
  approvalStatus: workLogApprovalStatusEnum("approval_status").default("draft").notNull(),
  approvedById: bigint("approved_by_id", { mode: 'bigint' }),
  approvedAt: timestamp("approved_at", { mode: 'date', precision: 6 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workLog_index_staffId_logDate").on(table.staffId, table.logDate),
    index("workLog_index_approvalStatus_logDate").on(table.approvalStatus, table.logDate),
    index("workLog_index_projectId").on(table.projectId),
    index("workLog_index_fundId").on(table.fundId),
    index("workLog_index_grantId").on(table.grantId),
]);

export type WorkLog = typeof workLog.$inferSelect;
export type NewWorkLog = typeof workLog.$inferInsert;

export const modules_operations_workRelations = defineRelationsPart({ projectTimesheetEntry, teamGoal, teamObjective, teamKpi, workItem, workLog });
