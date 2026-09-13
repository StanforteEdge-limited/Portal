import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

export const document = pgTable("sta_documents", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  category: varchar("category", { length: 50 }).default("policy").notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  version: varchar("version", { length: 40 }).default("1.0").notNull(),
  effectiveDate: date("effective_date", { mode: 'date' }),
  contentHtml: text("content_html"),
  fileId: uuid("file_id"),
  linkUrl: varchar("link_url", { length: 2048 }),
  requireAcknowledgement: boolean("require_acknowledgement").default(false).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
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
  documentId: uuid("document_id").notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
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

export const modules_requests_documentsRelations = defineRelationsPart({ document, documentAcknowledgement });
