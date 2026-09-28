import { defineRelationsPart } from 'drizzle-orm';
import {
  bigint,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const onboardingStatusEnum = pgEnum('onboarding_status', [
  'invited',
  'accepted',
  'profile_pending',
  'forms_pending',
  'hr_review',
  'completed',
]);
export type OnboardingStatus = typeof onboardingStatusEnum.enumValues[number];

/**
 * Wizard state for a single user. Owned by the onboarding module — the employee
 * module reads it to render an employee's onboarding state, and the identity
 * module reads the status to decide whether the invite flow is still open.
 */
export const onboardingProgress = pgTable('sta_onboarding_progress', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  userId: bigint('user_id', { mode: 'bigint' }).notNull().unique(),
  status: onboardingStatusEnum('status').default('invited').notNull(),
  currentStep: varchar('current_step', { length: 80 }),
  stepsJson: jsonb('steps_json'),
  dueDate: date('due_date', { mode: 'date' }),
  completedAt: timestamp('completed_at', { mode: 'date', precision: 6 }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("onboardingProgress_index_status").on(table.status),
]);

export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type NewOnboardingProgress = typeof onboardingProgress.$inferInsert;

export const modules_hr_onboardingRelations = defineRelationsPart({ onboardingProgress });
