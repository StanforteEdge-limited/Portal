import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/directory/organizations/model';
import { fileAsset } from '$modules/platform/files/model';
import { tenant } from '$modules/tenancy/model';

export const document = pgTable("sta_documents", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }).references(() => organization.id, { onDelete: 'set null' }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  category: varchar("category", { length: 50 }).default("policy").notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  version: varchar("version", { length: 40 }).default("1.0").notNull(),
  effectiveDate: date("effective_date", { mode: 'date' }),
  contentHtml: text("content_html"),
  fileId: uuid("file_id").references(() => fileAsset.id, { onDelete: 'set null' }),
  linkUrl: varchar("link_url", { length: 2048 }),
  requireAcknowledgement: boolean("require_acknowledgement").default(false).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("document_index_tenantId").on(table.tenantId),
    index("document_index_organizationId").on(table.organizationId),
    index("document_index_status").on(table.status),
    index("document_index_category").on(table.category),
]);

export type Document = typeof document.$inferSelect;
export type NewDocument = typeof document.$inferInsert;

export const documentAcknowledgement = pgTable("sta_document_acknowledgements", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  documentId: uuid("document_id").notNull().references(() => document.id, { onDelete: 'cascade' }),
  userId: bigint("user_id", { mode: 'bigint' }).notNull().references(() => profile.id, { onDelete: 'cascade' }),
  version: varchar("version", { length: 40 }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: varchar("user_agent", { length: 512 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_document_ack").on(table.documentId, table.userId, table.version),
    index("documentAcknowledgement_index_userId").on(table.userId),
]);

export type DocumentAcknowledgement = typeof documentAcknowledgement.$inferSelect;
export type NewDocumentAcknowledgement = typeof documentAcknowledgement.$inferInsert;

export const modules_requests_documentsRelations = defineRelationsPart({ document, documentAcknowledgement, profile, organization, fileAsset, tenant }, (r) => ({
  document: {
    tenant: r.one.tenant({ from: r.document.tenantId, to: r.tenant.id, optional: false }),
    organization: r.one.organization({ from: r.document.organizationId, to: r.organization.id }),
    file: r.one.fileAsset({ from: r.document.fileId, to: r.fileAsset.id }),
    creator: r.one.profile({ from: r.document.createdBy, to: r.profile.id, alias: 'document_creator' }),
    updater: r.one.profile({ from: r.document.updatedBy, to: r.profile.id, alias: 'document_updater' }),
    acknowledgements: r.many.documentAcknowledgement(),
  },
  documentAcknowledgement: {
    document: r.one.document({ from: r.documentAcknowledgement.documentId, to: r.document.id, optional: false }),
    user: r.one.profile({ from: r.documentAcknowledgement.userId, to: r.profile.id, optional: false }),
  },
}));
