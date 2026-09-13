import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

export const acknowledgement = pgTable("sta_acknowledgements", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  subjectType: varchar("subject_type", { length: 60 }).notNull(),
  subjectId: varchar("subject_id", { length: 191 }).notNull(),
  subjectLabel: varchar("subject_label", { length: 255 }),
  version: varchar("version", { length: 60 }),
  status: varchar("status", { length: 20 }).default("acknowledged").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { mode: 'date', precision: 6 }),
  sourceFormSubmissionId: uuid("source_form_submission_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_ack_subject_version").on(table.userId, table.subjectType, table.subjectId, table.version),
    index("acknowledgement_index_subjectType_subjectId").on(table.subjectType, table.subjectId),
    index("acknowledgement_index_status").on(table.status),
]);

export type Acknowledgement = typeof acknowledgement.$inferSelect;
export type NewAcknowledgement = typeof acknowledgement.$inferInsert;

export const modules_requests_acknowledgementsRelations = defineRelationsPart({ acknowledgement });
