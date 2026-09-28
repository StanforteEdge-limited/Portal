import { Type, type Static } from '@sinclair/typebox';
import { MetadataSchema } from '../common/refs';

export const ProjectRoleSchema = Type.Union([
  Type.Literal('member'),
  Type.Literal('admin'),
  Type.Literal('moderator'),
]);
export type ProjectRole = Static<typeof ProjectRoleSchema>;

export const ProjectGovernanceStatusSchema = Type.Union([
  Type.Literal('planned'),
  Type.Literal('active'),
  Type.Literal('on_hold'),
  Type.Literal('completed'),
  Type.Literal('archived'),
]);
export type ProjectGovernanceStatus = Static<typeof ProjectGovernanceStatusSchema>;

/**
 * `start_date` and `end_date` are plain strings with no `@IsDateString()` in
 * the legacy DTO, so they are intentionally not date-formatted here.
 */
export const CreateProjectSchema = Type.Object({
  name: Type.String(),
  description: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  metadata: Type.Optional(MetadataSchema),
  owner_user_id: Type.Optional(Type.String()),
  project_code: Type.Optional(Type.String()),
  start_date: Type.Optional(Type.String()),
  end_date: Type.Optional(Type.String()),
  governance_status: Type.Optional(ProjectGovernanceStatusSchema),
});
export type CreateProject = Static<typeof CreateProjectSchema>;

export const UpdateProjectSchema = Type.Object({
  name: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
  metadata: Type.Optional(MetadataSchema),
  owner_user_id: Type.Optional(Type.String()),
  project_code: Type.Optional(Type.String()),
  start_date: Type.Optional(Type.String()),
  end_date: Type.Optional(Type.String()),
  governance_status: Type.Optional(ProjectGovernanceStatusSchema),
});
export type UpdateProject = Static<typeof UpdateProjectSchema>;

export const AddProjectMemberSchema = Type.Object({
  user_id: Type.String(),
  role: Type.Optional(ProjectRoleSchema),
});
export type AddProjectMember = Static<typeof AddProjectMemberSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const projectsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type projectsIdParams = Static<typeof projectsIdParamsSchema>;

/** `active_only` is compared against the literal string `'true'`. */
export const ProjectsListQuerySchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  owner_user_id: Type.Optional(Type.String()),
  active_only: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
});
export type ProjectsListQuery = Static<typeof ProjectsListQuerySchema>;
