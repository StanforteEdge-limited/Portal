import { Type, type Static } from '@sinclair/typebox';
import { UuidSchema } from '../common/primitives';

export const CreateTaxonomySchema = Type.Object({
  key: Type.String(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  module: Type.Optional(Type.String()),
  /** How terms are rendered, e.g. `tag`, `tree`, `select`. */
  render_type: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
});
export type CreateTaxonomy = Static<typeof CreateTaxonomySchema>;

export const UpdateTaxonomySchema = Type.Object({
  key: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  module: Type.Optional(Type.String()),
  render_type: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpdateTaxonomy = Static<typeof UpdateTaxonomySchema>;

/** Adds a term, or updates it when the label already exists. */
export const UpsertTagTermSchema = Type.Object({
  label: Type.String(),
  value: Type.Optional(Type.String()),
});
export type UpsertTagTerm = Static<typeof UpsertTagTermSchema>;

/** Bulk term sync. The service reconciles create, update, and removal. */
export const SyncTaxonomyTermsSchema = Type.Object({
  terms: Type.Array(Type.String()),
});
export type SyncTaxonomyTerms = Static<typeof SyncTaxonomyTermsSchema>;

/** Replaces the full tag set for one entity, not a merge. */
export const ReplaceEntityTagsSchema = Type.Object({
  term_ids: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
  labels: Type.Optional(Type.Array(Type.String())),
});
export type ReplaceEntityTags = Static<typeof ReplaceEntityTagsSchema>;

/** Replaces the option list on a field definition. */
export const UpdateFieldOptionsSchema = Type.Object({
  options: Type.Array(Type.String()),
});
export type UpdateFieldOptions = Static<typeof UpdateFieldOptionsSchema>;

/** A term within a taxonomy, including its placement in the tree. */
export const TagTermSchema = Type.Object({
  id: UuidSchema,
  taxonomy_id: Type.Optional(UuidSchema),
  label: Type.String(),
  value: Type.Optional(Type.String()),
  parent_id: Type.Optional(Type.Union([UuidSchema, Type.Null()])),
  display_order: Type.Optional(Type.Integer()),
  is_active: Type.Optional(Type.Boolean()),
});
export type TagTerm = Static<typeof TagTermSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const taxonomyIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type taxonomyIdParams = Static<typeof taxonomyIdParamsSchema>;

/** Terms are addressed by taxonomy key rather than numeric id. */
export const TaxonomyKeyParamsSchema = Type.Object({
  taxonomyKey: Type.String(),
});
export type TaxonomyKeyParams = Static<typeof TaxonomyKeyParamsSchema>;

/** One entity's tags within one taxonomy. */
export const EntityTagsParamsSchema = Type.Object({
  entityType: Type.String(),
  entityId: Type.String(),
  taxonomyKey: Type.String(),
});
export type EntityTagsParams = Static<typeof EntityTagsParamsSchema>;

/** Field option sets hang off a form field id. */
export const TaxonomyFieldParamsSchema = Type.Object({
  fieldId: Type.String(),
});
export type TaxonomyFieldParams = Static<typeof TaxonomyFieldParamsSchema>;

/** Autocomplete input for the tag picker. */
export const SuggestTagTermsQuerySchema = Type.Object({
  query: Type.Optional(Type.String({ maxLength: 120 })),
});
export type SuggestTagTermsQuery = Static<typeof SuggestTagTermsQuerySchema>;

/** `include_inactive` is compared against the literal string `'true'`. */
export const TaxonomyListQuerySchema = Type.Object({
  module: Type.Optional(Type.String()),
  group_id: Type.Optional(Type.String()),
  include_inactive: Type.Optional(Type.String()),
});
export type TaxonomyListQuery = Static<typeof TaxonomyListQuerySchema>;
