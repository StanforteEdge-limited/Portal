import { defineRelationsPart } from 'drizzle-orm';
import { bigint, index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { tenant } from '$modules/tenancy/model';

export const analyticsEvent = pgTable('sta_analytics_events', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  profileId: bigint('profile_id', { mode: 'bigint' }),
  name: varchar('name', { length: 120 }).notNull(),
  source: varchar('source', { length: 80 }).notNull(),
  properties: jsonb('properties'),
  occurredAt: timestamp('occurred_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  index('analytics_event_tenant_name_idx').on(table.tenantId, table.name),
  index('analytics_event_occurred_idx').on(table.occurredAt),
]);

export type AnalyticsEvent = typeof analyticsEvent.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvent.$inferInsert;

export const modules_analyticsRelations = defineRelationsPart({ analyticsEvent });
