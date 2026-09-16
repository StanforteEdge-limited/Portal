import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, index, integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { profile } from '$modules/identity/users/model';
import { tenant } from '$modules/tenancy/model';
import { crmAccount } from '../accounts/model';
import { crmContact } from '../contacts/model';

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

export type CrmLead = typeof crmLead.$inferSelect;
export type NewCrmLead = typeof crmLead.$inferInsert;

export const modules_crm_leadsRelations = defineRelationsPart({ crmLead });
