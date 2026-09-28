import { Type, type Static } from '@sinclair/typebox';
import { UuidSchema } from '../common/primitives';
import { MetadataSchema } from '../common/refs';

/* -------------------------------------------------------------------------- */
/* Form definition                                                            */
/* -------------------------------------------------------------------------- */

export const CreateFormSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 150 }),
  description: Type.Optional(Type.String()),
  /** Owning module, used to group forms in the admin UI. */
  module: Type.Optional(Type.String()),
  storage_type: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
});
export type CreateForm = Static<typeof CreateFormSchema>;

/** Every field of `CreateForm` becomes optional. */
export const UpdateFormSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 2, maxLength: 150 })),
  description: Type.Optional(Type.String()),
  module: Type.Optional(Type.String()),
  storage_type: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpdateForm = Static<typeof UpdateFormSchema>;

/* -------------------------------------------------------------------------- */
/* Form fields                                                                */
/* -------------------------------------------------------------------------- */

export const CreateFormFieldSchema = Type.Object({
  /** Stable machine key referenced by `validation_rules` and submissions. */
  field_key: Type.String({ minLength: 1, maxLength: 100 }),
  field_label: Type.String({ minLength: 1, maxLength: 255 }),
  field_type: Type.String(),
  /** Select options, keyed by value. Shape depends on `field_type`. */
  field_options: Type.Optional(MetadataSchema),
  is_required: Type.Optional(Type.Boolean()),
  validation_rules: Type.Optional(MetadataSchema),
  display_order: Type.Optional(Type.Integer({ minimum: 0 })),
});
export type CreateFormField = Static<typeof CreateFormFieldSchema>;

/** `field_key` is immutable; only presentation and validation may change. */
export const UpdateFormFieldSchema = Type.Object({
  field_label: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  field_type: Type.Optional(Type.String()),
  field_options: Type.Optional(MetadataSchema),
  is_required: Type.Optional(Type.Boolean()),
  validation_rules: Type.Optional(MetadataSchema),
  display_order: Type.Optional(Type.Integer({ minimum: 0 })),
});
export type UpdateFormField = Static<typeof UpdateFormFieldSchema>;

/* -------------------------------------------------------------------------- */
/* Assignments                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Assigns a form to a role, a single profile, or both. A null target clears
 * the assignment, so the service treats an all-null payload as an unassign.
 */
export const CreateFormAssignmentSchema = Type.Object({
  form_id: Type.String({ format: 'uuid' }),
  assigned_to_role: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  assigned_to_profile_id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  due_date: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});
export type CreateFormAssignment = Static<typeof CreateFormAssignmentSchema>;

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

/** A form with its fields, returned when loading a form for completion. */
export const FormWithFieldsSchema = Type.Object({
  id: UuidSchema,
  name: Type.String(),
  description: Type.Optional(Type.String()),
  module: Type.Optional(Type.String()),
  storage_type: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
  fields: Type.Optional(Type.Array(Type.Unknown())),
});
export type FormWithFields = Static<typeof FormWithFieldsSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const formsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type formsIdParams = Static<typeof formsIdParamsSchema>;

/** Filters read by both the user-facing and management list endpoints. */
export const FormsListQuerySchema = Type.Object({
  module: Type.Optional(Type.String()),
  form_id: Type.Optional(Type.String()),
  include_inactive: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
});
export type FormsListQuery = Static<typeof FormsListQuerySchema>;
