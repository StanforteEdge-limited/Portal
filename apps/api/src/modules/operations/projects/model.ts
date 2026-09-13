import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { tenant } from '$modules/tenancy/model';

export const project = pgTable("sta_projects", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("project_index_tenantId").on(table.tenantId),
    index("project_index_organizationId").on(table.organizationId),
    index("project_index_isActive").on(table.isActive),
]);

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;

export const projectGovernance = pgTable("sta_project_governance", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  projectId: bigint("project_id", { mode: 'bigint' }).notNull().unique(),
  projectCode: varchar("project_code", { length: 50 }),
  ownerUserId: bigint("owner_user_id", { mode: 'bigint' }),
  startDate: date("start_date", { mode: 'date' }),
  endDate: date("end_date", { mode: 'date' }),
  governanceStatus: varchar("governance_status", { length: 30 }).default("planned").notNull(),
  metadata: jsonb("metadata"),
}, (table) => [
    index("projectGovernance_index_ownerUserId").on(table.ownerUserId),
    index("projectGovernance_index_governanceStatus").on(table.governanceStatus),
]);

export type ProjectGovernance = typeof projectGovernance.$inferSelect;
export type NewProjectGovernance = typeof projectGovernance.$inferInsert;

export const projectMember = pgTable("sta_project_members", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  projectId: bigint("project_id", { mode: 'bigint' }).notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  role: groupUserRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  addedBy: bigint("added_by", { mode: 'bigint' }),
  isPrimary: boolean("is_primary").default(false).notNull(),
}, (table) => [
    uniqueIndex("unique_project_user").on(table.projectId, table.userId),
    index("projectMember_index_userId").on(table.userId),
    index("projectMember_index_role").on(table.role),
]);

export type ProjectMember = typeof projectMember.$inferSelect;
export type NewProjectMember = typeof projectMember.$inferInsert;

export const modules_operations_projectsRelations = defineRelationsPart({ project, projectGovernance, projectMember });
