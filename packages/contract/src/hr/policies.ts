import { Type, type Static } from '@sinclair/typebox';
import { IsoDateOrDateTimeSchema } from '../common/primitives';
import { MetadataSchema } from '../common/refs';

/** Resolves the effective policy value for a subject. */
export const ResolvePolicySchema = Type.Object({
  module: Type.String({ maxLength: 60 }),
  policy_key: Type.String({ maxLength: 120 }),
  context: Type.Optional(
    Type.Object({
      organization_id: Type.Optional(Type.String()),
      team_id: Type.Optional(Type.String()),
      staff_type: Type.Optional(Type.String()),
      user_id: Type.Optional(Type.String()),
    }),
  ),
});
export type ResolvePolicy = Static<typeof ResolvePolicySchema>;

/**
 * The generated `UpdatePolicyDto` was a bare `additionalProperties: true`
 * object. The legacy DTO is `PartialType(CreatePolicyDto)`, so the update
 * shape is every create field made optional.
 */
export const UpdatePolicySchema = Type.Object({
  module: Type.Optional(Type.String({ maxLength: 60 })),
  policy_key: Type.Optional(Type.String({ maxLength: 120 })),
  scope_type: Type.Optional(Type.String({ maxLength: 40 })),
  scope_id: Type.Optional(Type.String({ maxLength: 191 })),
  priority: Type.Optional(Type.Integer({ minimum: 0 })),
  config_json: Type.Optional(MetadataSchema),
  effective_from: Type.Optional(IsoDateOrDateTimeSchema),
  effective_to: Type.Optional(IsoDateOrDateTimeSchema),
  is_active: Type.Optional(Type.Boolean()),
  document_id: Type.Optional(Type.String()),
  document_version: Type.Optional(Type.String({ maxLength: 40 })),
  require_acknowledgement: Type.Optional(Type.Boolean()),
});
export type UpdatePolicy = Static<typeof UpdatePolicySchema>;

/** Shared with `UpdatePolicy`; kept separate so the create contract reads clearly. */
export const CreatePolicySchema = Type.Object({
  module: Type.String({ maxLength: 60 }),
  policy_key: Type.String({ maxLength: 120 }),
  scope_type: Type.Optional(Type.String({ maxLength: 40 })),
  scope_id: Type.Optional(Type.String({ maxLength: 191 })),
  priority: Type.Optional(Type.Integer({ minimum: 0 })),
  config_json: MetadataSchema,
  effective_from: Type.Optional(IsoDateOrDateTimeSchema),
  effective_to: Type.Optional(IsoDateOrDateTimeSchema),
  is_active: Type.Optional(Type.Boolean()),
  document_id: Type.Optional(Type.String()),
  document_version: Type.Optional(Type.String({ maxLength: 40 })),
  require_acknowledgement: Type.Optional(Type.Boolean()),
});
export type CreatePolicy = Static<typeof CreatePolicySchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const policiesIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type policiesIdParams = Static<typeof policiesIdParamsSchema>;

/**
 * `modules` is read with an `Array.isArray` guard, so it is typed as a union
 * rather than forced to an array.
 */
export const PoliciesListQuerySchema = Type.Object({
  module: Type.Optional(Type.String()),
  modules: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  policy_key: Type.Optional(Type.String()),
  scope_type: Type.Optional(Type.String()),
  scope_id: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.String()),
  page: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.String()),
});
export type PoliciesListQuery = Static<typeof PoliciesListQuerySchema>;
