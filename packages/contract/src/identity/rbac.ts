import { Type, type Static } from '@sinclair/typebox';
import { IdSchema, PaginationQuerySchema } from '../common/primitives';

export const RbacIdParamsSchema = Type.Object({
  id: IdSchema,
});
export type RbacIdParams = Static<typeof RbacIdParamsSchema>;

export const RbacListQuerySchema = PaginationQuerySchema;
export type RbacListQuery = Static<typeof RbacListQuerySchema>;

/**
 * Grants a set of role ids to a user, scoped to an organization.
 *
 * Distinct from `identity/users.AssignUserRolesSchema`, which *replaces* a
 * user's full role set by slug. Both endpoints previously exported a type named
 * `AssignUserRolesDto` with conflicting shapes; they are now named for what
 * they do.
 */
export const AssignUserRoleIdsSchema = Type.Object({
  role_ids: Type.Array(IdSchema, { minItems: 1 }),
  organization_id: Type.Optional(IdSchema),
  replace_existing: Type.Optional(Type.Boolean()),
  primary_role_id: Type.Optional(IdSchema),
});
export type AssignUserRoleIds = Static<typeof AssignUserRoleIdsSchema>;

export const CreatePermissionSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 50 }),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  description: Type.Optional(Type.String()),
  module: Type.Optional(Type.String({ maxLength: 50 })),
});
export type CreatePermission = Static<typeof CreatePermissionSchema>;

export const UpdatePermissionSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  description: Type.Optional(Type.String()),
  module: Type.Optional(Type.String({ maxLength: 50 })),
});
export type UpdatePermission = Static<typeof UpdatePermissionSchema>;

export const CreateRoleSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 50 }),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  description: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
  permission_ids: Type.Optional(Type.Array(IdSchema)),
});
export type CreateRole = Static<typeof CreateRoleSchema>;

export const UpdateRoleSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  description: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
  permission_ids: Type.Optional(Type.Array(IdSchema)),
});
export type UpdateRole = Static<typeof UpdateRoleSchema>;

export const SetRolePermissionsSchema = Type.Object({
  permission_ids: Type.Array(IdSchema, { minItems: 1 }),
});
export type SetRolePermissions = Static<typeof SetRolePermissionsSchema>;
