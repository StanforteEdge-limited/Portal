import { defineRelationsPart } from 'drizzle-orm';
import { bigint, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { profile } from '$modules/identity/users/model';
import { tenant } from '$modules/tenancy/model';

export const auditEvent = pgTable("sta_audit_events", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  userId: bigint("user_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  comment: text("comment"),
  data: jsonb("data"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  index("auditEvent_index_tenantId").on(table.tenantId),
  index("auditEvent_index_userId").on(table.userId),
  index("auditEvent_index_entity").on(table.entityType, table.entityId),
  index("auditEvent_index_createdAt").on(table.createdAt),
]);

export type AuditEvent = typeof auditEvent.$inferSelect;
export type NewAuditEvent = typeof auditEvent.$inferInsert;

export const modules_identity_auditRelations = defineRelationsPart({ auditEvent, profile, tenant }, (r) => ({
  auditEvent: {
    tenant: r.one.tenant({ from: r.auditEvent.tenantId, to: r.tenant.id, optional: false }),
    user: r.one.profile({ from: r.auditEvent.userId, to: r.profile.id }),
  },
}));