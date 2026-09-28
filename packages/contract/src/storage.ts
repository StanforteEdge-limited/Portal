import { Type, type Static } from '@sinclair/typebox';
import { IdSchema, PaginationQuerySchema, UuidSchema } from './common/primitives';
import { MetadataSchema } from './common/refs';

/* -------------------------------------------------------------------------- */
/* Query                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Filters for the file asset list. `include_usage` and `attached` stay strings
 * because the service compares them against `'true'`/`'false'` rather than
 * parsing them, so a non-boolean value is simply ignored instead of rejected.
 */
export const StorageListQuerySchema = Type.Intersect([
  PaginationQuerySchema,
  Type.Object({
    organization_id: Type.Optional(IdSchema),
    uploaded_by: Type.Optional(IdSchema),
    folder_id: Type.Optional(IdSchema),
    request_item_id: Type.Optional(IdSchema),
    mime_type: Type.Optional(Type.String()),
    file_type: Type.Optional(Type.String()),
    include_usage: Type.Optional(Type.String()),
    attached: Type.Optional(Type.String()),
    /** Folder listing: the parent whose children are being read. */
    parent_id: Type.Optional(IdSchema),
  }),
]);
export type StorageListQuery = Static<typeof StorageListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

/** Registers an already-uploaded object as a file asset. */
export const AttachFileSchema = Type.Object({
  /** Storage disk. Only `s3` is supported; local-disk uploads are disabled. */
  storage_disk: Type.Optional(Type.String()),
  storage_path: Type.String(),
  file_name: Type.String(),
  mime_type: Type.Optional(Type.String()),
  file_size: Type.Optional(Type.Number()),
  file_url: Type.Optional(Type.String()),
  organization_id: Type.Optional(UuidSchema),
  folder_id: Type.Optional(Type.String()),
  metadata: Type.Optional(MetadataSchema),
});
export type AttachFile = Static<typeof AttachFileSchema>;
