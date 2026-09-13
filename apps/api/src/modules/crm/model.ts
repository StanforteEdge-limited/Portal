import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '$modules/tenancy/model';
import { profile } from '$modules/identity/users/model';

export const crmAccount = pgTable("sta_crm_accounts", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 120 }),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  type: varchar("type", { length: 30 }).default("customer").notNull(),
  lifecycleStage: varchar("lifecycle_stage", { length: 30 }).default("prospect").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  ownerProfileId: bigint("owner_profile_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("crm_account_index_tenantId").on(table.tenantId),
  index("crm_account_index_ownerProfileId").on(table.ownerProfileId),
]);

export const crmContact = pgTable("sta_crm_contacts", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  accountId: bigint("account_id", { mode: 'bigint' }).references(() => crmAccount.id, { onDelete: 'set null' }),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  jobTitle: varchar("job_title", { length: 160 }),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("crm_contact_email_tenant_unique").on(table.tenantId, table.email),
  index("crm_contact_index_tenantId").on(table.tenantId),
  index("crm_contact_index_accountId").on(table.accountId),
]);

export const crmLead = pgTable("sta_crm_leads", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  company: varchar("company", { length: 255 }),
  source: varchar("source", { length: 60 }),
  status: varchar("status", { length: 30 }).default("new").notNull(),
  score: integer("score").default(0).notNull(),
  ownerProfileId: bigint("owner_profile_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  convertedAccountId: bigint("converted_account_id", { mode: 'bigint' }).references(() => crmAccount.id, { onDelete: 'set null' }),
  convertedContactId: bigint("converted_contact_id", { mode: 'bigint' }).references(() => crmContact.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("crm_lead_email_tenant_unique").on(table.tenantId, table.email),
  index("crm_lead_index_tenantId").on(table.tenantId),
  index("crm_lead_index_ownerProfileId").on(table.ownerProfileId),
  index("crm_lead_index_status").on(table.status),
]);

export const crmPipeline = pgTable("sta_crm_pipelines", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("crm_pipeline_index_tenantId").on(table.tenantId),
]);

export const crmPipelineStage = pgTable("sta_crm_pipeline_stages", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  pipelineId: bigint("pipeline_id", { mode: 'bigint' }).notNull().references(() => crmPipeline.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 160 }).notNull(),
  position: integer("position").default(0).notNull(),
  probability: integer("probability").default(0).notNull(),
  color: varchar("color", { length: 20 }),
  isWon: boolean("is_won").default(false).notNull(),
  isLost: boolean("is_lost").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("crm_pipeline_stage_position_unique").on(table.pipelineId, table.position),
  index("crm_pipeline_stage_index_tenantId").on(table.tenantId),
]);

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

export const crmActivity = pgTable("sta_crm_activities", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  accountId: bigint("account_id", { mode: 'bigint' }).references(() => crmAccount.id, { onDelete: 'set null' }),
  contactId: bigint("contact_id", { mode: 'bigint' }).references(() => crmContact.id, { onDelete: 'set null' }),
  opportunityId: bigint("opportunity_id", { mode: 'bigint' }).references(() => crmOpportunity.id, { onDelete: 'set null' }),
  type: varchar("type", { length: 20 }).default("note").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  dueAt: timestamp("due_at", { mode: 'date', precision: 6 }),
  doneAt: timestamp("done_at", { mode: 'date', precision: 6 }),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("crm_activity_index_tenantId").on(table.tenantId),
  index("crm_activity_index_accountId").on(table.accountId),
  index("crm_activity_index_contactId").on(table.contactId),
  index("crm_activity_index_opportunityId").on(table.opportunityId),
]);

export type CrmAccount = typeof crmAccount.$inferSelect;
export type NewCrmAccount = typeof crmAccount.$inferInsert;
export type CrmContact = typeof crmContact.$inferSelect;
export type NewCrmContact = typeof crmContact.$inferInsert;
export type CrmLead = typeof crmLead.$inferSelect;
export type NewCrmLead = typeof crmLead.$inferInsert;
export type CrmPipeline = typeof crmPipeline.$inferSelect;
export type NewCrmPipeline = typeof crmPipeline.$inferInsert;
export type CrmPipelineStage = typeof crmPipelineStage.$inferSelect;
export type NewCrmPipelineStage = typeof crmPipelineStage.$inferInsert;
export type CrmOpportunity = typeof crmOpportunity.$inferSelect;
export type NewCrmOpportunity = typeof crmOpportunity.$inferInsert;
export type CrmActivity = typeof crmActivity.$inferSelect;
export type NewCrmActivity = typeof crmActivity.$inferInsert;

export const modules_crmRelations = defineRelationsPart({
  crmAccount, crmContact, crmLead, crmPipeline, crmPipelineStage, crmOpportunity, crmActivity,
});