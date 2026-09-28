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
/* Query                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `listOrganizations` returns the tenant's orgs with their children already
 * attached, so there is no page/per_page pair: the service reports a single
 * page sized to the result set.
 */
export const OrganizationsListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })),
  is_active: Type.Optional(Type.String()),
  organization_type: Type.Optional(Type.String()),
});
export type OrganizationsListQuery = Static<typeof OrganizationsListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                           */
/* -------------------------------------------------------------------------- */

export const organizationsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type organizationsIdParams = Static<typeof organizationsIdParamsSchema>;
