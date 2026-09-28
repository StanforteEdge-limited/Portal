import { Type, type Static } from '@sinclair/typebox';

/**
 * Plan slug, e.g. `trial`, `pro`, `enterprise-monthly`. Lowercase alphanumeric
 * with `-`/`_` separators, 2-50 characters.
 */
export const ChangeSubscriptionSchema = Type.Object({
  plan: Type.String({ minLength: 2, maxLength: 50, pattern: '^[a-z0-9][a-z0-9_-]{1,49}$' }),
});
export type ChangeSubscription = Static<typeof ChangeSubscriptionSchema>;
