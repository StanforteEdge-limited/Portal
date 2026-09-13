import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/directory/organizations/model';
import { tenant } from '$modules/tenancy/model';

export const fileAsset = pgTable("sta_file_assets", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }).references(() => organization.id, { onDelete: 'set null' }),
  uploadedBy: bigint("uploaded_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  storageDisk: varchar("storage_disk", { length: 30 }).default("local").notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }),
  fileSize: bigint("file_size", { mode: 'bigint' }),
  publicUrl: varchar("public_url", { length: 500 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("fileAsset_index_tenantId").on(table.tenantId),
    index("fileAsset_index_organizationId").on(table.organizationId),
    index("fileAsset_index_uploadedBy").on(table.uploadedBy),
]);

export type FileAsset = typeof fileAsset.$inferSelect;
export type NewFileAsset = typeof fileAsset.$inferInsert;

export const modules_platform_filesRelations = defineRelationsPart({ fileAsset, profile, organization, tenant }, (r) => ({
  fileAsset: {
    tenant: r.one.tenant({ from: r.fileAsset.tenantId, to: r.tenant.id, optional: false }),
    organization: r.one.organization({ from: r.fileAsset.organizationId, to: r.organization.id }),
    uploader: r.one.profile({ from: r.fileAsset.uploadedBy, to: r.profile.id }),
  },
}));
