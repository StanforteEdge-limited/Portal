import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, index, integer, numeric, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { profile } from '$modules/identity/users/model';
import { tenant } from '$modules/tenancy/model';
import { crmAccount } from '../accounts/model';
import { crmContact } from '../contacts/model';
import { crmPipeline, crmPipelineStage } from '../pipelines/model';

export const crmOpportunity = pgTable("sta_crm_opportunities", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  accountId: bigint("account_id", { mode: 'bigint' }).references(() => crmAccount.id, { onDelete: 'set null' }),
  contactId: bigint("contact_id", { mode: 'bigint' }).references(() => crmContact.id, { onDelete: 'set null' }),
  pipelineId: bigint("pipeline_id", { mode: 'bigint' }).references(() => crmPipeline.id, { onDelete: 'set null' }),
  stageId: bigint("stage_id", { mode: 'bigint' }).references(() => crmPipelineStage.id, { onDelete: 'set null' }),
  ownerProfileId: bigint("owner_profile_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 12 }),
  probability: integer("probability").default(0).notNull(),
  expectedCloseDate: timestamp("expected_close_date", { mode: 'date', precision: 6 }),
  source: varchar("source", { length: 60 }),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("crm_opportunity_index_tenantId").on(table.tenantId),
  index("crm_opportunity_index_accountId").on(table.accountId),
  index("crm_opportunity_index_stageId").on(table.stageId),
  index("crm_opportunity_index_ownerProfileId").on(table.ownerProfileId),
]);

export type CrmOpportunity = typeof crmOpportunity.$inferSelect;
export type NewCrmOpportunity = typeof crmOpportunity.$inferInsert;

export const modules_crm_opportunitiesRelations = defineRelationsPart({ crmOpportunity });
