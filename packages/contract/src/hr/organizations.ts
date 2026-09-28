import { Type, type Static } from '@sinclair/typebox';
import { MetadataSchema } from '../common/refs';

export const OrganizationTypeSchema = Type.Union([
  Type.Literal('group'),
  Type.Literal('venture'),
  Type.Literal('shared_function'),
]);
export type OrganizationType = Static<typeof OrganizationTypeSchema>;

export const CreateOrganizationSchema = Type.Object({
  name: Type.String(),
  code: Type.String(),
  organization_type: Type.Optional(OrganizationTypeSchema),
  is_active: Type.Optional(Type.Boolean()),
  /** Builds the org tree. Must not create a cycle. */
  parent_organization_id: Type.Optional(Type.String()),
  metadata: Type.Optional(MetadataSchema),
});
export type CreateOrganization = Static<typeof CreateOrganizationSchema>;

/** `parent_organization_id` accepts null to detach an org from the tree. */
export const UpdateOrganizationSchema = Type.Object({
  name: Type.Optional(Type.String()),
  code: Type.Optional(Type.String()),
  organization_type: Type.Optional(OrganizationTypeSchema),
  is_active: Type.Optional(Type.Boolean()),
  parent_organization_id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  metadata: Type.Optional(MetadataSchema),
});
export type UpdateOrganization = Static<typeof UpdateOrganizationSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const organizationsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type organizationsIdParams = Static<typeof organizationsIdParamsSchema>;
