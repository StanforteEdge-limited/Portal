import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { profile } from '$modules/identity/users/model';
import { tenant } from '$modules/tenancy/model';

export const backgroundJob = pgTable(
  'sta_background_jobs',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    tenantId: bigint('tenant_id', { mode: 'bigint' })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 80 }).notNull(),
    status: varchar('status', { length: 20 }).default('queued').notNull(),
    progress: integer('progress').default(0).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    payload: jsonb('payload'),
    result: jsonb('result'),
    error: text('error'),
    notifiable: boolean('notifiable').default(true).notNull(),
    createdBy: bigint('created_by', { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { mode: 'date', precision: 6 }),
    finishedAt: timestamp('finished_at', { mode: 'date', precision: 6 }),
  },
  (table) => [
    index('background_job_idx_tenant_status').on(table.tenantId, table.status),
    index('background_job_idx_type').on(table.type),
    index('background_job_idx_created_at').on(table.createdAt),
  ],
);

export type BackgroundJob = typeof backgroundJob.$inferSelect;
export type NewBackgroundJob = typeof backgroundJob.$inferInsert;