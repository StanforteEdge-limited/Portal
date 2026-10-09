import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { profile } from '$apps/identity/users/model';
import { project } from '$apps/hr/projects/model';
import { fileAsset } from '$apps/storage/model';
import { tenant } from '$apps/tenancy/model';

export const workItemTypeEnum = pgEnum("work_item_type", ["weekly_task", "daily_task", "project_activity", "recurring_responsibility", "ad_hoc"]);
export type WorkItemType = typeof workItemTypeEnum.enumValues[number];

export const workItemStatusEnum = pgEnum("work_item_status", ["planned", "in_progress", "completed", "blocked", "carried_over", "cancelled"]);
export type WorkItemStatus = typeof workItemStatusEnum.enumValues[number];

export const workPriorityEnum = pgEnum("work_priority", ["low", "medium", "high", "critical"]);
export type WorkPriority = typeof workPriorityEnum.enumValues[number];

export const workLogApprovalStatusEnum = pgEnum("work_log_approval_status", ["draft", "submitted", "approved", "rejected"]);
export type WorkLogApprovalStatus = typeof workLogApprovalStatusEnum.enumValues[number];

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

export const sprint = pgTable("sta_sprints", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  projectId: bigint("project_id", { mode: 'bigint' }).notNull().references(() => project.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  goal: text("goal"),
  startDate: date("start_date", { mode: 'date' }),
  endDate: date("end_date", { mode: 'date' }),
  status: varchar("status", { length: 20 }).default("planned").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("sprint_index_tenantId").on(table.tenantId),
    index("sprint_index_projectId").on(table.projectId),
    index("sprint_index_status").on(table.status),
]);

export type Sprint = typeof sprint.$inferSelect;
export type NewSprint = typeof sprint.$inferInsert;

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
  projectId: bigint("project_id", { mode: 'bigint' }).references(() => project.id, { onDelete: 'set null' }),
  sprintId: bigint("sprint_id", { mode: 'bigint' }).references(() => sprint.id, { onDelete: 'set null' }),
  parentId: uuid("parent_id").references(() => workItem.id, { onDelete: 'cascade' }),
  color: varchar("color", { length: 40 }),
  tags: jsonb("tags"),
  estimatePoints: integer("estimate_points"),
  sortOrder: integer("sort_order").default(0).notNull(),
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
    index("workItem_index_sprintId").on(table.sprintId),
    index("workItem_index_parentId").on(table.parentId),
]);

export type WorkItem = typeof workItem.$inferSelect;
export type NewWorkItem = typeof workItem.$inferInsert;

export const workLog = pgTable("sta_work_logs", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  workItemId: uuid("work_item_id").notNull().references(() => workItem.id, { onDelete: 'cascade' }),
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

export const workItemComment = pgTable("sta_work_item_comments", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  workItemId: uuid("work_item_id").notNull().references(() => workItem.id, { onDelete: 'cascade' }),
  body: text("body").notNull(),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("workItemComment_index_tenantId").on(table.tenantId),
  index("workItemComment_index_workItemId_createdAt").on(table.workItemId, table.createdAt),
  index("workItemComment_index_createdBy").on(table.createdBy),
]);

export type WorkItemComment = typeof workItemComment.$inferSelect;
export type NewWorkItemComment = typeof workItemComment.$inferInsert;

export const workItemCommentMention = pgTable("sta_work_item_comment_mentions", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  commentId: bigint("comment_id", { mode: 'bigint' }).notNull().references(() => workItemComment.id, { onDelete: 'cascade' }),
  userId: bigint("user_id", { mode: 'bigint' }).notNull().references(() => profile.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("work_item_comment_mention_unique").on(table.commentId, table.userId),
  index("workItemCommentMention_index_tenantId").on(table.tenantId),
  index("workItemCommentMention_index_userId").on(table.userId),
]);

export type WorkItemCommentMention = typeof workItemCommentMention.$inferSelect;
export type NewWorkItemCommentMention = typeof workItemCommentMention.$inferInsert;

export const workItemAttachment = pgTable("sta_work_item_attachments", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  workItemId: uuid("work_item_id").notNull().references(() => workItem.id, { onDelete: 'cascade' }),
  fileAssetId: uuid("file_asset_id").notNull().references(() => fileAsset.id, { onDelete: 'cascade' }),
  label: varchar("label", { length: 150 }),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("work_item_attachment_item_file_unique").on(table.workItemId, table.fileAssetId),
  index("workItemAttachment_index_tenantId").on(table.tenantId),
  index("workItemAttachment_index_workItemId").on(table.workItemId),
  index("workItemAttachment_index_fileAssetId").on(table.fileAssetId),
]);

export type WorkItemAttachment = typeof workItemAttachment.$inferSelect;
export type NewWorkItemAttachment = typeof workItemAttachment.$inferInsert;

export const modules_hrm_tasksRelations = defineRelationsPart({
  teamGoal,
  teamObjective,
  teamKpi,
  workItem,
  workItemComment,
  workItemCommentMention,
  workItemAttachment,
  workLog,
  sprint,
});

