import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

export const role = pgTable("sta_roles", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull(),
});

export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;

export const permission = pgTable("sta_permissions", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  module: varchar("module", { length: 50 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull(),
});

export type Permission = typeof permission.$inferSelect;
export type NewPermission = typeof permission.$inferInsert;

export const rolePermission = pgTable("sta_role_permissions", {
  roleId: bigint("role_id", { mode: 'bigint' }).notNull(),
  permissionId: bigint("permission_id", { mode: 'bigint' }).notNull(),
  assignedAt: timestamp("assigned_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
});

export type RolePermission = typeof rolePermission.$inferSelect;
export type NewRolePermission = typeof rolePermission.$inferInsert;

export const userRole = pgTable("sta_user_roles", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  profileId: bigint("profile_id", { mode: 'bigint' }).notNull(),
  roleId: bigint("role_id", { mode: 'bigint' }).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  isPrimaryRole: boolean("is_primary_role").default(false).notNull(),
  assignedAt: timestamp("assigned_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("profile_role_org_unique").on(table.profileId, table.roleId, table.organizationId),
    index("userRole_index_tenantId").on(table.tenantId),
]);

export type UserRole = typeof userRole.$inferSelect;
export type NewUserRole = typeof userRole.$inferInsert;

export const modules_auth_rbacRelations = defineRelationsPart({ role, permission, rolePermission, userRole });
