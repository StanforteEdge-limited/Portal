import { defineRelationsPart } from 'drizzle-orm';
import { bigint, boolean, date, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '$apps/tenancy/model';
import { profile } from '$apps/identity/users/model';

/**
 * Departments are the unit an approver resolver can walk: "the manager of the
 * requester's department" needs a department with managers attached, which the
 * `organization` tree cannot express (it models legal structure, and one
 * person can sit in several departments).
 */
export const department = pgTable('sta_departments', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' })
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  /** Self-referencing tree, so escalation can walk upward to a parent dept. */
  parentDepartmentId: uuid('parent_department_id'),
  /** Optional link to the legal entity this department sits under. */
  organizationId: bigint('organization_id', { mode: 'bigint' }),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: varchar('description', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: bigint('created_by', { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  updatedBy: bigint('updated_by', { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 })
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('department_tenant_code_unique').on(table.tenantId, table.code),
  index('department_index_tenantId').on(table.tenantId),
  index('department_index_parentDepartmentId').on(table.parentDepartmentId),
  index('department_index_organizationId').on(table.organizationId),
]);

export type Department = typeof department.$inferSelect;
export type NewDepartment = typeof department.$inferInsert;

/**
 * Membership is a table rather than a column on the employee profile because
 * a person can belong to several departments, a department can have more than
 * one manager, and `effectiveTo` lets an approval resolve who *was* the manager
 * when a request was submitted rather than who is today.
 */
export const departmentMember = pgTable('sta_department_members', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' })
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => department.id, { onDelete: 'cascade' }),
  profileId: bigint('profile_id', { mode: 'bigint' })
    .notNull()
    .references(() => profile.id, { onDelete: 'cascade' }),
  isManager: boolean('is_manager').default(false).notNull(),
  /** Null means "currently a member"; set to date-stamp the end of a stint. */
  effectiveFrom: date('effective_from', { mode: 'date' }).defaultNow().notNull(),
  effectiveTo: date('effective_to', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 })
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  // One stint per person per department, so re-adding after `effectiveTo` is a
  // new row rather than a silent overwrite of history.
  uniqueIndex('department_member_unique').on(table.departmentId, table.profileId, table.effectiveFrom),
  index('department_member_index_departmentId').on(table.departmentId),
  index('department_member_index_profileId').on(table.profileId),
  index('department_member_index_tenantId').on(table.tenantId),
]);

export type DepartmentMember = typeof departmentMember.$inferSelect;
export type NewDepartmentMember = typeof departmentMember.$inferInsert;

export const modules_hr_departmentsRelations = defineRelationsPart(
  { department, departmentMember, profile },
  (r) => ({
    department: {
      parent: r.one.department({
        from: r.department.parentDepartmentId,
        to: r.department.id,
        alias: 'department_parent',
      }),
      // No `children` relation: a self-referencing `r.many` needs an explicit
      // from/to pair, and the tree is assembled in `DepartmentsService.tree()`,
      // which also needs to filter on tenant and is_active.
      members: r.many.departmentMember(),
    },
    departmentMember: {
      department: r.one.department({
        from: r.departmentMember.departmentId,
        to: r.department.id,
        optional: false,
      }),
      profile: r.one.profile({ from: r.departmentMember.profileId, to: r.profile.id, optional: false }),
    },
  }),
);
