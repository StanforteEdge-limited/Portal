import { Type, type Static } from '@sinclair/typebox';
import { UuidSchema } from '../common/primitives';

/* -------------------------------------------------------------------------- */
/* Departments                                                                 */
/* -------------------------------------------------------------------------- */

export const CreateDepartmentSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 150 }),
  /** Unique per tenant. Slug-like, used by the flow builder to pick a dept. */
  code: Type.String({ minLength: 1, maxLength: 50 }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  /** Self-referencing; must not create a cycle. */
  parent_department_id: Type.Optional(UuidSchema),
  organization_id: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  is_active: Type.Optional(Type.Boolean()),
});
export type CreateDepartment = Static<typeof CreateDepartmentSchema>;

/** Every create field optional. A null `parent_department_id` detaches the dept. */
export const UpdateDepartmentSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  code: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  parent_department_id: Type.Optional(Type.Union([UuidSchema, Type.Null()])),
  organization_id: Type.Optional(Type.Union([Type.String({ pattern: '^\\d+$' }), Type.Null()])),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpdateDepartment = Static<typeof UpdateDepartmentSchema>;

export const DepartmentsListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 150 })),
  parent_department_id: Type.Optional(UuidSchema),
  organization_id: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  /** Compared against the literal string `'true'`, so it stays a string. */
  include_inactive: Type.Optional(Type.String()),
  page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  per_page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
});
export type DepartmentsListQuery = Static<typeof DepartmentsListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Membership                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `profile_id` is a bigint, so it crosses the wire as a digit string, matching
 * every other profile id in the API.
 */
export const AssignDepartmentMemberSchema = Type.Object({
  profile_id: Type.String({ pattern: '^\\d+$' }),
  /** A department may have more than one manager. */
  is_manager: Type.Optional(Type.Boolean()),
  effective_from: Type.Optional(Type.String()),
  /** Omitted or null means an open-ended stint. */
  effective_to: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});
export type AssignDepartmentMember = Static<typeof AssignDepartmentMemberSchema>;

export const DepartmentMembersListQuerySchema = Type.Object({
  managers_only: Type.Optional(Type.String()),
  /** Defaults to current members only. */
  include_ended: Type.Optional(Type.String()),
  page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  per_page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
});
export type DepartmentMembersListQuery = Static<typeof DepartmentMembersListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                           */
/* -------------------------------------------------------------------------- */

export const DepartmentsIdParamsSchema = Type.Object({
  id: UuidSchema,
});
export type DepartmentsIdParams = Static<typeof DepartmentsIdParamsSchema>;

/** A member is addressed by department and profile. */
export const DepartmentMemberParamsSchema = Type.Object({
  departmentId: UuidSchema,
  profileId: Type.String({ pattern: '^\\d+$' }),
});
export type DepartmentMemberParams = Static<typeof DepartmentMemberParamsSchema>;
