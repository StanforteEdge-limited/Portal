import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema, IdSchema, PasswordSchema } from './common/primitives';
import { MetadataSchema } from './common/refs';

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

/** Replaces the member's role set within a tenant. */
export const AssignTenantRolesSchema = Type.Object({
  roles: Type.Array(Type.String(), { minItems: 1 }),
});
export type AssignTenantRoles = Static<typeof AssignTenantRolesSchema>;

/** Provisions a tenant together with its first (owning) member. */
export const CreateWorkspaceSchema = Type.Object({
  name: Type.String({ minLength: 2 }),
  slug: Type.Optional(Type.String()),
  plan: Type.Optional(Type.String()),
  email: EmailSchema,
  first_name: Type.Optional(Type.String()),
  last_name: Type.Optional(Type.String()),
  password: PasswordSchema,
});
export type CreateWorkspace = Static<typeof CreateWorkspaceSchema>;

/** Irreversible tenant teardown. `confirm` must be sent explicitly. */
export const DecommissionTenantSchema = Type.Object({
  confirm: Type.Boolean(),
});
export type DecommissionTenant = Static<typeof DecommissionTenantSchema>;

export const InviteTenantMemberSchema = Type.Object({
  email: EmailSchema,
  message: Type.Optional(Type.String({ maxLength: 500 })),
});
export type InviteTenantMember = Static<typeof InviteTenantMemberSchema>;

export const TransferOwnershipSchema = Type.Object({
  profile_id: IdSchema,
});
export type TransferOwnership = Static<typeof TransferOwnershipSchema>;

export const UpdateTenantSchema = Type.Object({
  name: Type.Optional(Type.String({ maxLength: 255 })),
  plan: Type.Optional(Type.String({ maxLength: 50 })),
  metadata: Type.Optional(MetadataSchema),
});
export type UpdateTenant = Static<typeof UpdateTenantSchema>;
