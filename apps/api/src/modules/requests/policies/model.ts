import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

export const policy = pgTable("sta_policies", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  module: varchar("module", { length: 60 }).notNull(),
  policyKey: varchar("policy_key", { length: 120 }).notNull(),
  scopeType: varchar("scope_type", { length: 40 }).default("global").notNull(),
  scopeId: varchar("scope_id", { length: 191 }),
  priority: integer("priority").default(100).notNull(),
  configJson: jsonb("config_json").notNull(),
  effectiveFrom: timestamp("effective_from", { mode: 'date', precision: 6 }),
  effectiveTo: timestamp("effective_to", { mode: 'date', precision: 6 }),
  isActive: boolean("is_active").default(true).notNull(),
  documentId: uuid("document_id"),
  documentVersion: varchar("document_version", { length: 40 }),
  requireAcknowledgement: boolean("require_acknowledgement").default(false).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("policy_index_module_policyKey_isActive").on(table.module, table.policyKey, table.isActive),
    index("policy_index_scopeType_scopeId").on(table.scopeType, table.scopeId),
    index("policy_index_effectiveFrom_effectiveTo").on(table.effectiveFrom, table.effectiveTo),
]);

export type Policy = typeof policy.$inferSelect;
export type NewPolicy = typeof policy.$inferInsert;

export const modules_requests_policiesRelations = defineRelationsPart({ policy });
