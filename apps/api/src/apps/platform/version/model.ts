import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';

export const systemVersion = pgTable("sta_system_versions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  minVersion: varchar("min_version", { length: 50 }).notNull(),
  forceUpdate: boolean("force_update").default(false).notNull(),
  releaseNotes: jsonb("release_notes"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("uniqueIndex_platform_module").on(table.platform, table.module),
]);

export type SystemVersion = typeof systemVersion.$inferSelect;
export type NewSystemVersion = typeof systemVersion.$inferInsert;

export const modules_platform_versionRelations = defineRelationsPart({ systemVersion });
