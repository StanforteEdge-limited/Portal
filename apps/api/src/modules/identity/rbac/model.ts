import { defineRelationsPart, isNull } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, primaryKey, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/hrm/organizations/model';
import { tenant } from '$modules/tenancy/model';

export const role = pgTable("sta_roles", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull(),
}, (table) => [
    uniqueIndex("role_global_slug_unique").on(table.slug).where(isNull(table.tenantId)),
    uniqueIndex("role_tenant_slug_unique").on(table.slug, table.tenantId),
    index("role_index_tenantId").on(table.tenantId),
]);

export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;

export const permission = pgTable("sta_permissions", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 50 }).notNull(),
  module: varchar("module", { length: 50 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull(),
}, (table) => [
    uniqueIndex("permission_global_slug_unique").on(table.slug).where(isNull(table.tenantId)),
    uniqueIndex("permission_tenant_slug_unique").on(table.slug, table.tenantId),
    index("permission_index_tenantId").on(table.tenantId),
]);

export type Permission = typeof permission.$inferSelect;
export type NewPermission = typeof permission.$inferInsert;

export const rolePermission = pgTable("sta_role_permissions", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  roleId: bigint("role_id", { mode: 'bigint' }).notNull().references(() => role.id, { onDelete: 'cascade' }),
  permissionId: bigint("permission_id", { mode: 'bigint' }).notNull().references(() => permission.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("role_permission_global_unique").on(table.roleId, table.permissionId).where(isNull(table.tenantId)),
    uniqueIndex("role_permission_tenant_unique").on(table.roleId, table.permissionId, table.tenantId),
    index("rolePermission_index_tenantId").on(table.tenantId),
]);

export type RolePermission = typeof rolePermission.$inferSelect;
export type NewRolePermission = typeof rolePermission.$inferInsert;

export const userRole = pgTable("sta_user_roles", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  profileId: bigint("profile_id", { mode: 'bigint' }).notNull().references(() => profile.id, { onDelete: 'cascade' }),
  roleId: bigint("role_id", { mode: 'bigint' }).notNull().references(() => role.id, { onDelete: 'cascade' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }).references(() => organization.id, { onDelete: 'cascade' }),
  isPrimaryRole: boolean("is_primary_role").default(false).notNull(),
  assignedAt: timestamp("assigned_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("profile_role_org_unique").on(table.profileId, table.roleId, table.organizationId),
    index("userRole_index_tenantId").on(table.tenantId),
]);

export type UserRole = typeof userRole.$inferSelect;
export type NewUserRole = typeof userRole.$inferInsert;

export const modules_identity_rbacRelations = defineRelationsPart({ role, permission, rolePermission, userRole, profile, organization, tenant }, (r) => ({
  role: {
    permissions: r.many.permission({
      from: r.role.id.through(r.rolePermission.roleId),
      to: r.permission.id.through(r.rolePermission.permissionId),
    }),
    userRoles: r.many.userRole(),
  },
  permission: {
    roles: r.many.role({
      from: r.permission.id.through(r.rolePermission.permissionId),
      to: r.role.id.through(r.rolePermission.roleId),
    }),
  },
  rolePermission: {
    role: r.one.role({ from: r.rolePermission.roleId, to: r.role.id, optional: false }),
    permission: r.one.permission({ from: r.rolePermission.permissionId, to: r.permission.id, optional: false }),
  },
  userRole: {
    tenant: r.one.tenant({ from: r.userRole.tenantId, to: r.tenant.id, optional: false }),
    profile: r.one.profile({ from: r.userRole.profileId, to: r.profile.id, optional: false }),
    role: r.one.role({ from: r.userRole.roleId, to: r.role.id, optional: false }),
    organization: r.one.organization({ from: r.userRole.organizationId, to: r.organization.id }),
  },
}));
