import { bigint, boolean, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const subscriptionPlan = pgTable('sta_subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  description: varchar('description', { length: 500 }),
  amountMinor: integer('amount_minor').default(0).notNull(),
  currency: varchar('currency', { length: 3 }).default('NGN').notNull(),
  interval: varchar('interval', { length: 20 }).default('monthly').notNull(),
  features: jsonb('features').default({}).notNull(),
  limits: jsonb('limits').default({}).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('subscription_plan_unique_code').on(table.code),
]);

export const tenantSubscription = pgTable('sta_tenant_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull(),
  planId: uuid('plan_id').notNull(),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  startsAt: timestamp('starts_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  endsAt: timestamp('ends_at', { mode: 'date', precision: 6 }),
  trialEndsAt: timestamp('trial_ends_at', { mode: 'date', precision: 6 }),
  provider: varchar('provider', { length: 30 }),
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('tenant_subscription_unique_active').on(table.tenantId, table.status),
  uniqueIndex('tenant_subscription_provider_unique').on(table.provider, table.providerSubscriptionId),
]);

export type SubscriptionPlan = typeof subscriptionPlan.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlan.$inferInsert;
export type TenantSubscription = typeof tenantSubscription.$inferSelect;
export type NewTenantSubscription = typeof tenantSubscription.$inferInsert;
