import { Type, type Static } from '@sinclair/typebox';
import { IsoDateOrDateTimeSchema } from '../common/primitives';

/** Creates or replaces a document. `file_id` and `link_url` are alternatives. */
export const CreateDocumentSchema = Type.Object({
  title: Type.String({ maxLength: 255 }),
  slug: Type.Optional(Type.String({ maxLength: 180 })),
  category: Type.Optional(Type.String({ maxLength: 50 })),
  status: Type.Optional(Type.String({ maxLength: 30 })),
  version: Type.Optional(Type.String({ maxLength: 40 })),
  effective_date: Type.Optional(IsoDateOrDateTimeSchema),
  content_html: Type.Optional(Type.String()),
  file_id: Type.Optional(Type.String()),
  link_url: Type.Optional(Type.String({ maxLength: 2048 })),
  require_acknowledgement: Type.Optional(Type.Boolean()),
  organization_id: Type.Optional(Type.String()),
});
export type CreateDocument = Static<typeof CreateDocumentSchema>;

/** Every field is optional; the service applies a partial update. */
export const UpdateDocumentSchema = Type.Object({
  title: Type.Optional(Type.String({ maxLength: 255 })),
  slug: Type.Optional(Type.String({ maxLength: 180 })),
  category: Type.Optional(Type.String({ maxLength: 50 })),
  status: Type.Optional(Type.String({ maxLength: 30 })),
  version: Type.Optional(Type.String({ maxLength: 40 })),
  effective_date: Type.Optional(IsoDateOrDateTimeSchema),
  content_html: Type.Optional(Type.String()),
  file_id: Type.Optional(Type.String()),
  link_url: Type.Optional(Type.String({ maxLength: 2048 })),
  require_acknowledgement: Type.Optional(Type.Boolean()),
  organization_id: Type.Optional(Type.String()),
});
export type UpdateDocument = Static<typeof UpdateDocumentSchema>;

/** Moves a document through its lifecycle, e.g. `draft` -> `published`. */
export const UpdateDocumentStatusSchema = Type.Object({
  status: Type.String(),
  resolution_notes: Type.Optional(Type.String()),
});
export type UpdateDocumentStatus = Static<typeof UpdateDocumentStatusSchema>;

/** Confirms the current user has read a specific document version. */
export const AcknowledgeDocumentSchema = Type.Object({
  version: Type.Optional(Type.String({ maxLength: 40 })),
});
export type AcknowledgeDocument = Static<typeof AcknowledgeDocumentSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const documentsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type documentsIdParams = Static<typeof documentsIdParamsSchema>;

/** Filters read by the document list service. */
export const DocumentsListQuerySchema = Type.Object({
  category: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  version: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  require_acknowledgement: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  page: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.String()),
});
export type DocumentsListQuery = Static<typeof DocumentsListQuerySchema>;
