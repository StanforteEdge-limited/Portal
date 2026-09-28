import { Type, type Static } from '@sinclair/typebox';
import { IdSchema, LongTextSchema } from '../common/primitives';

/** Role a member holds inside a group. */
const GroupRoleSchema = Type.Union([
  Type.Literal('member'),
  Type.Literal('lead'),
  Type.Literal('manager'),
]);

export const AddGroupMemberSchema = Type.Object({
  user_id: IdSchema,
  role: Type.Optional(GroupRoleSchema),
  /** Organizations the new member is scoped to. */
  organization_ids: Type.Optional(Type.Array(IdSchema)),
});
export type AddGroupMember = Static<typeof AddGroupMemberSchema>;

export const CreateTeamSchema = Type.Object({
  name: Type.String(),
  description: Type.Optional(LongTextSchema),
  is_active: Type.Optional(Type.Boolean()),
  organization_id: Type.Optional(IdSchema),
  organization_ids: Type.Optional(Type.Array(IdSchema)),
  primary_organization_id: Type.Optional(IdSchema),
  /** Free-form group classification, e.g. `department` or `committee`. */
  group_type: Type.Optional(Type.String()),
});
export type CreateTeam = Static<typeof CreateTeamSchema>;

/** Replaces the organization scope of an existing member. */
export const SetGroupMemberScopesSchema = Type.Object({
  organization_ids: Type.Array(IdSchema),
  scope_role: Type.Optional(Type.String()),
});
export type SetGroupMemberScopes = Static<typeof SetGroupMemberScopesSchema>;

export const SetGroupOrganizationsSchema = Type.Object({
  organization_ids: Type.Array(IdSchema),
  primary_organization_id: Type.Optional(IdSchema),
});
export type SetGroupOrganizations = Static<typeof SetGroupOrganizationsSchema>;

export const UpdateTeamSchema = Type.Object({
  name: Type.Optional(Type.String()),
  description: Type.Optional(LongTextSchema),
  organization_id: Type.Optional(IdSchema),
  organization_ids: Type.Optional(Type.Array(IdSchema)),
  primary_organization_id: Type.Optional(IdSchema),
  is_active: Type.Optional(Type.Boolean()),
  group_type: Type.Optional(Type.String()),
});
export type UpdateTeam = Static<typeof UpdateTeamSchema>;
