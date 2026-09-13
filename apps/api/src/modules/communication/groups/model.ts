import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { tenant } from '$modules/tenancy/model';

export const group = pgTable("sta_groups", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).default("general").notNull(),
  parentId: bigint("parent_id", { mode: 'bigint' }),
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type Group = typeof group.$inferSelect;
export type NewGroup = typeof group.$inferInsert;

export const groupUser = pgTable("sta_group_users", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  groupId: bigint("group_id", { mode: 'bigint' }).notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  role: groupUserRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  addedBy: bigint("added_by", { mode: 'bigint' }),
  isPrimary: boolean("is_primary").default(false).notNull(),
}, (table) => [
    uniqueIndex("unique_group_user").on(table.groupId, table.userId),
]);

export type GroupUser = typeof groupUser.$inferSelect;
export type NewGroupUser = typeof groupUser.$inferInsert;

export const groupOrganization = pgTable("sta_group_organizations", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  groupId: bigint("group_id", { mode: 'bigint' }).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("unique_group_organization").on(table.groupId, table.organizationId),
    index("groupOrganization_index_tenantId").on(table.tenantId),
    index("groupOrganization_index_organizationId").on(table.organizationId),
]);

export type GroupOrganization = typeof groupOrganization.$inferSelect;
export type NewGroupOrganization = typeof groupOrganization.$inferInsert;

export const groupUserOrganizationScope = pgTable("sta_group_user_organization_scopes", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  groupUserId: bigint("group_user_id", { mode: 'bigint' }).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }).notNull(),
  scopeRole: varchar("scope_role", { length: 50 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("unique_group_user_organization_scope").on(table.groupUserId, table.organizationId),
    index("groupUserOrganizationScope_index_tenantId").on(table.tenantId),
    index("groupUserOrganizationScope_index_organizationId").on(table.organizationId),
]);

export type GroupUserOrganizationScope = typeof groupUserOrganizationScope.$inferSelect;
export type NewGroupUserOrganizationScope = typeof groupUserOrganizationScope.$inferInsert;

export const modules_directory_groupsRelations = defineRelationsPart({ group, groupUser, groupOrganization, groupUserOrganizationScope });
