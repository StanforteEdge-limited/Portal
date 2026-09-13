import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

export const officeLocation = pgTable("sta_office_locations", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer("radius_meters").default(150).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type OfficeLocation = typeof officeLocation.$inferSelect;
export type NewOfficeLocation = typeof officeLocation.$inferInsert;

export const organizationOfficeLocation = pgTable("sta_organization_office_locations", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }).notNull(),
  officeLocationId: bigint("office_location_id", { mode: 'bigint' }).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("unique_org_office_location").on(table.organizationId, table.officeLocationId),
    index("organizationOfficeLocation_index_officeLocationId").on(table.officeLocationId),
]);

export type OrganizationOfficeLocation = typeof organizationOfficeLocation.$inferSelect;
export type NewOrganizationOfficeLocation = typeof organizationOfficeLocation.$inferInsert;

export const organization = pgTable("sta_organizations", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  parentOrganizationId: bigint("parent_organization_id", { mode: 'bigint' }),
  organizationType: organizationTypeEnum("organization_type").default("venture").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull(),
}, (table) => [
    index("organization_index_tenantId").on(table.tenantId),
]);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

export const profileOrganization = pgTable("sta_profile_organizations", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  profileId: bigint("profile_id", { mode: 'bigint' }).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  startDate: date("start_date", { mode: 'date' }),
  endDate: date("end_date", { mode: 'date' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).notNull(),
}, (table) => [
    uniqueIndex("profile_org_unique").on(table.profileId, table.organizationId),
    index("profileOrganization_index_tenantId").on(table.tenantId),
]);

export type ProfileOrganization = typeof profileOrganization.$inferSelect;
export type NewProfileOrganization = typeof profileOrganization.$inferInsert;

export const modules_directory_organizationsRelations = defineRelationsPart({ officeLocation, organizationOfficeLocation, organization, profileOrganization });
