import { Type, type Static } from '@sinclair/typebox';
import { IdSchema, IsoDateOrDateTimeSchema, UuidSchema } from '../common/primitives';
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
/* Kanban cards                                                               */
/* -------------------------------------------------------------------------- */

export const ProjectCardTagsSchema = Type.Array(Type.String({ minLength: 1, maxLength: 80 }), {
  maxItems: 25,
});

export const UpsertProjectCardSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String()),
  status: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  position: Type.Optional(Type.Number()),
  color: Type.Optional(Type.String({ maxLength: 40 })),
  tags: Type.Optional(ProjectCardTagsSchema),
  assigned_to_id: Type.Optional(IdSchema),
  due_date: Type.Optional(IsoDateOrDateTimeSchema),
  metadata: Type.Optional(MetadataSchema),
});
export type UpsertProjectCard = Static<typeof UpsertProjectCardSchema>;

export const UpdateProjectCardSchema = Type.Partial(UpsertProjectCardSchema);
export type UpdateProjectCard = Static<typeof UpdateProjectCardSchema>;

export const ProjectCardsListQuerySchema = Type.Object({
  status: Type.Optional(Type.String()),
  tag: Type.Optional(Type.String()),
  assigned_to_id: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
});
export type ProjectCardsListQuery = Static<typeof ProjectCardsListQuerySchema>;

export const ProjectCardParamsSchema = Type.Object({
  id: IdSchema,
  cardId: UuidSchema,
});
export type ProjectCardParams = Static<typeof ProjectCardParamsSchema>;

export const AddProjectCardAttachmentSchema = Type.Object({
  file_asset_id: UuidSchema,
  label: Type.Optional(Type.String({ maxLength: 150 })),
});
export type AddProjectCardAttachment = Static<typeof AddProjectCardAttachmentSchema>;

export const ProjectCardAttachmentParamsSchema = Type.Object({
  id: IdSchema,
  cardId: UuidSchema,
  attachmentId: IdSchema,
});
export type ProjectCardAttachmentParams = Static<typeof ProjectCardAttachmentParamsSchema>;

export const CreateProjectCardUpdateSchema = Type.Object({
  body: Type.String({ minLength: 1 }),
  tagged_user_ids: Type.Optional(Type.Array(IdSchema)),
  metadata: Type.Optional(MetadataSchema),
});
export type CreateProjectCardUpdate = Static<typeof CreateProjectCardUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const projectsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type projectsIdParams = Static<typeof projectsIdParamsSchema>;

/** Removing a member needs both the project and the member's user id. */
export const ProjectMemberParamsSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
});
export type ProjectMemberParams = Static<typeof ProjectMemberParamsSchema>;

/** `active_only` is compared against the literal string `'true'`. */
export const ProjectsListQuerySchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  owner_user_id: Type.Optional(Type.String()),
  active_only: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
});
export type ProjectsListQuery = Static<typeof ProjectsListQuerySchema>;
