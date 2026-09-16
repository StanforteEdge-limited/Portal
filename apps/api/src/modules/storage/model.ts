import { defineRelationsPart } from 'drizzle-orm';
import { AnyPgColumn, bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/directory/organizations/model';
import { tenant } from '$modules/tenancy/model';

export const storageFolder = pgTable("sta_storage_folders", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  parentId: bigint("parent_id", { mode: 'bigint' }).references((): AnyPgColumn => storageFolder.id, { onDelete: 'set null' }),
  name: varchar("name", { length: 255 }).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("storage_folder_tenant_parent_name_unique").on(table.tenantId, table.parentId, table.name),
  index("storage_folder_index_tenantId").on(table.tenantId),
  index("storage_folder_index_parentId").on(table.parentId),
]);

export const fileAsset = pgTable("sta_file_assets", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }).references(() => organization.id, { onDelete: 'set null' }),
  folderId: bigint("folder_id", { mode: 'bigint' }).references(() => storageFolder.id, { onDelete: 'set null' }),
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
    index("fileAsset_index_folderId").on(table.folderId),
    index("fileAsset_index_uploadedBy").on(table.uploadedBy),
]);

export type StorageFolder = typeof storageFolder.$inferSelect;
export type NewStorageFolder = typeof storageFolder.$inferInsert;
export type FileAsset = typeof fileAsset.$inferSelect;
export type NewFileAsset = typeof fileAsset.$inferInsert;

export const modules_storageRelations = defineRelationsPart({ fileAsset, storageFolder, profile, organization, tenant }, (r) => ({
  storageFolder: {
    tenant: r.one.tenant({ from: r.storageFolder.tenantId, to: r.tenant.id, optional: false }),
    parent: r.one.storageFolder({ from: r.storageFolder.parentId, to: r.storageFolder.id }),
    createdByProfile: r.one.profile({ from: r.storageFolder.createdBy, to: r.profile.id }),
  },
  fileAsset: {
    tenant: r.one.tenant({ from: r.fileAsset.tenantId, to: r.tenant.id, optional: false }),
    organization: r.one.organization({ from: r.fileAsset.organizationId, to: r.organization.id }),
    folder: r.one.storageFolder({ from: r.fileAsset.folderId, to: r.storageFolder.id }),
    uploader: r.one.profile({ from: r.fileAsset.uploadedBy, to: r.profile.id }),
  },
}));