import { bigint, boolean, index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const subscriptionPlan = pgTable('sta_subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  description: varchar('description', { length: 500 }),
  features: jsonb('features').default({}).notNull(),
  limits: jsonb('limits').default({}).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('subscription_plan_unique_code').on(table.code),
]);

export const subscriptionPlanPrice = pgTable('sta_subscription_plan_prices', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  planId: uuid('plan_id').notNull(),
  provider: varchar('provider', { length: 30 }).notNull(),
  amountMinor: integer('amount_minor').default(0).notNull(),
  currency: varchar('currency', { length: 3 }).default('NGN').notNull(),
  interval: varchar('interval', { length: 20 }).default('monthly').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('subscription_plan_price_unique').on(table.planId, table.provider, table.currency, table.interval),
  index('subscription_plan_price_plan_idx').on(table.planId),
]);

export const tenantSubscription = pgTable('sta_tenant_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull(),
  planId: uuid('plan_id').notNull(),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  startsAt: timestamp('starts_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  endsAt: timestamp('ends_at', { mode: 'date', precision: 6 }),
  trialEndsAt: timestamp('trial_ends_at', { mode: 'date', precision: 6 }),
  currentPeriodStart: timestamp('current_period_start', { mode: 'date', precision: 6 }),
  currentPeriodEnd: timestamp('current_period_end', { mode: 'date', precision: 6 }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  provider: varchar('provider', { length: 30 }),
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('tenant_subscription_tenant_status_idx').on(table.tenantId, table.status),
  uniqueIndex('tenant_subscription_provider_unique').on(table.provider, table.providerSubscriptionId),
]);

export type SubscriptionPlan = typeof subscriptionPlan.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlan.$inferInsert;
export type SubscriptionPlanPrice = typeof subscriptionPlanPrice.$inferSelect;
export type NewSubscriptionPlanPrice = typeof subscriptionPlanPrice.$inferInsert;
export type TenantSubscription = typeof tenantSubscription.$inferSelect;
export type NewTenantSubscription = typeof tenantSubscription.$inferInsert;

export const billingInvoice = pgTable('sta_billing_invoices', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull(),
  subscriptionId: uuid('subscription_id'),
  planId: uuid('plan_id').notNull(),
  number: varchar('number', { length: 40 }).notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  status: varchar('status', { length: 30 }).default('pending').notNull(),
  dueAt: timestamp('due_at', { mode: 'date', precision: 6 }).notNull(),
  paidAt: timestamp('paid_at', { mode: 'date', precision: 6 }),
  provider: varchar('provider', { length: 30 }),
  providerReference: varchar('provider_reference', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('billing_invoice_unique_number').on(table.number),
  uniqueIndex('billing_invoice_unique_provider_reference').on(table.provider, table.providerReference),
  index('billing_invoice_tenant_idx').on(table.tenantId),
  index('billing_invoice_tenant_status_idx').on(table.tenantId, table.status),
]);

export const billingPaymentAttempt = pgTable('sta_billing_payment_attempts', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull(),
  invoiceId: uuid('invoice_id').notNull(),
  provider: varchar('provider', { length: 30 }).notNull(),
  reference: varchar('reference', { length: 255 }).notNull(),
  status: varchar('status', { length: 30 }).default('initialized').notNull(),
  authorizationUrl: varchar('authorization_url', { length: 1000 }),
  paidAt: timestamp('paid_at', { mode: 'date', precision: 6 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('billing_attempt_unique_reference').on(table.provider, table.reference),
  index('billing_attempt_tenant_idx').on(table.tenantId),
  index('billing_attempt_invoice_idx').on(table.invoiceId),
]);

export const billingWebhookEvent = pgTable('sta_billing_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  provider: varchar('provider', { length: 30 }).notNull(),
  eventId: varchar('event_id', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { mode: 'date', precision: 6 }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('billing_webhook_unique_event').on(table.provider, table.eventId),
]);
