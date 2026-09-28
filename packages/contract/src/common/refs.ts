import { Type, type Static } from '@sinclair/typebox';
import { IdSchema } from './primitives';

/**
 * Cross-domain reference shapes. These appear in dozens of response payloads,
 * so they live in one place rather than being re-declared per module.
 */

export const OrganizationRefSchema = Type.Object({
  id: IdSchema,
  name: Type.String(),
  code: Type.Optional(Type.String()),
  is_primary: Type.Optional(Type.Boolean()),
});
export type OrganizationRef = Static<typeof OrganizationRefSchema>;

export const TenantRefSchema = Type.Object({
  id: IdSchema,
  name: Type.String(),
  slug: Type.String(),
});
export type TenantRef = Static<typeof TenantRefSchema>;

/** A group, team or project the user belongs to. */
export const NamedGroupRefSchema = Type.Object({
  id: IdSchema,
  name: Type.String(),
  type: Type.Optional(Type.String()),
  role: Type.Optional(Type.String()),
  is_primary: Type.Optional(Type.Boolean()),
});
export type NamedGroupRef = Static<typeof NamedGroupRefSchema>;

/** Arbitrary tenant-defined metadata bag. */
export const MetadataSchema = Type.Record(Type.String(), Type.Unknown());
export type Metadata = Static<typeof MetadataSchema>;
