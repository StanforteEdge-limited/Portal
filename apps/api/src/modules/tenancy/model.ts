import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, jsonb, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/hrm/organizations/model';

export const tenant = pgTable('sta_tenants', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  plan: varchar('plan', { length: 50 }).default('trial').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('tenant_unique_slug').on(table.slug),
]);

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;

export const tenantMembership = pgTable('sta_tenant_memberships', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  profileId: bigint('profile_id', { mode: 'bigint' }).notNull().references(() => profile.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  isOwner: boolean('is_owner').default(false).notNull(),
  joinedAt: timestamp('joined_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  removedAt: timestamp('removed_at', { mode: 'date', precision: 6 }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('tenant_membership_unique_profile').on(table.tenantId, table.profileId),
]);

export type TenantMembership = typeof tenantMembership.$inferSelect;
export type NewTenantMembership = typeof tenantMembership.$inferInsert;

export const tenantOrganization = pgTable('sta_tenant_organizations', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  organizationId: bigint('organization_id', { mode: 'bigint' }).notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('tenant_organization_unique').on(table.tenantId, table.organizationId),
  uniqueIndex('tenant_organization_org_unique').on(table.organizationId),
]);

export type TenantOrganization = typeof tenantOrganization.$inferSelect;
export type NewTenantOrganization = typeof tenantOrganization.$inferInsert;

export const modules_tenancyRelations = defineRelationsPart({ tenant, tenantMembership, tenantOrganization, profile, organization }, (r) => ({
  tenant: {
    memberships: r.many.tenantMembership(),
    organizations: r.many.tenantOrganization(),
  },
  tenantMembership: {
    tenant: r.one.tenant({ from: r.tenantMembership.tenantId, to: r.tenant.id, optional: false }),
    profile: r.one.profile({ from: r.tenantMembership.profileId, to: r.profile.id, optional: false }),
  },
  tenantOrganization: {
    tenant: r.one.tenant({ from: r.tenantOrganization.tenantId, to: r.tenant.id, optional: false }),
    organization: r.one.organization({ from: r.tenantOrganization.organizationId, to: r.organization.id, optional: false }),
  },
}));
