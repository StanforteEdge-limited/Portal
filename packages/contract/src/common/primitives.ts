import { Type, type Static, type TSchema } from '@sinclair/typebox';

/**
 * The account password policy. Lives in the contract so the API can reject weak
 * passwords and the UI can show the rule before submit, from one definition.
 *
 * Mirrors the legacy `PASSWORD_POLICY_REGEX` in the NestJS build.
 */
export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_POLICY_MESSAGE =
  'password must include at least one uppercase letter, one lowercase letter, and one number';
export const PASSWORD_MIN_LENGTH = 8;

export const PasswordSchema = Type.String({
  minLength: PASSWORD_MIN_LENGTH,
  // The lookahead groups have no capture group, so this is a plain character
  // class test that survives JSON Schema serialization (where `pattern` is the
  // only regex primitive available).
  pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$',
});

export const EmailSchema = Type.String({ format: 'email', maxLength: 255 });

/** Opaque identifier. Kept as a string because bigint ids are stringified at the edge. */
export const IdSchema = Type.String({ minLength: 1 });

export const UuidSchema = Type.String({ format: 'uuid' });

/** `YYYY-MM-DD`, no time component. */
export const IsoDateSchema = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' });

/** Full ISO-8601 timestamp. */
export const IsoDateTimeSchema = Type.String({ format: 'date-time' });

/**
 * An ISO-8601 date *or* timestamp, e.g. `2026-03-18` or `2026-03-18T10:00:00Z`.
 *
 * Mirrors the legacy `@IsDateString()`, which accepted both forms. Using a bare
 * `format: 'date-time'` here would silently tighten that rule and reject the
 * date-only values the existing DTOs and their examples rely on.
 */
export const IsoDateOrDateTimeSchema = Type.String({
  pattern: '^\\d{4}-\\d{2}-\\d{2}([T ].*)?$',
});

/** A timestamp that may be absent, e.g. a soft-deleted `deleted_at`. */
export const NullableIsoDateTimeSchema = Type.Union([IsoDateTimeSchema, Type.Null()]);

/** Short human-facing label, e.g. a person's name or a role slug. */
export const ShortTextSchema = Type.String({ minLength: 1, maxLength: 100 });

/** Free-form multi-line text, e.g. a bio or a justification. */
export const LongTextSchema = Type.String({ maxLength: 5000 });

/**
 * Query parameters that arrive as strings. `per_page` is a number on the wire
 * only if the client serialized it that way, so it stays a string here and is
 * coerced by the service — matching existing behavior.
 */
export const PaginationQuerySchema = Type.Object({
  page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  per_page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  search: Type.Optional(Type.String()),
});
export type PaginationQuery = Static<typeof PaginationQuerySchema>;

/**
 * Pagination metadata as it appears on the wire. Mirrors the server's
 * `paginatedResponse` helper, which emits `pages` (total page count) rather
 * than a precomputed `last_page`.
 */
export const PaginationMetaSchema = Type.Object({
  page: Type.Integer(),
  per_page: Type.Integer(),
  total: Type.Integer(),
  pages: Type.Integer(),
});
export type PaginationMeta = Static<typeof PaginationMetaSchema>;

/** Standard list envelope: `{ data: { items, meta } }`. */
export const PaginatedListSchema = <T extends TSchema>(item: T) =>
  Type.Object({
    data: Type.Object({
      items: Type.Array(item),
      meta: PaginationMetaSchema,
    }),
  });

/**
 * Full wire shape of a successful paginated list response, as emitted by the
 * server's `paginatedResponse` helper.
 *
 * `PaginatedListSchema` above describes only the `data` half; the envelope adds
 * `success`, which the global response interceptor always sets. `meta` reuses
 * the schema-derived `PaginationMeta`, so the two cannot drift.
 */
export type PaginatedListResponse<T> = {
  success: true;
  data: {
    items: T[];
    meta: PaginationMeta;
  };
};
