import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, index, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { profile } from '$modules/identity/users/model';
import { tenant } from '$modules/tenancy/model';
import { crmAccount } from '../accounts/model';
import { crmContact } from '../contacts/model';
import { crmOpportunity } from '../opportunities/model';

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

export type CrmActivity = typeof crmActivity.$inferSelect;
export type NewCrmActivity = typeof crmActivity.$inferInsert;

export const modules_crm_activitiesRelations = defineRelationsPart({ crmActivity });
