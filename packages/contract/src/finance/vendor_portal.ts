import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema } from '../common/primitives';

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Vendor-portal sign-in. Vendors authenticate against their own credentials
 * rather than a portal account, so this is deliberately separate from
 * `identity/auth.Login`.
 */
export const VendorLoginSchema = Type.Object({
  email: EmailSchema,
  password: Type.String({ minLength: 1 }),
});
export type VendorLogin = Static<typeof VendorLoginSchema>;

/** Vendor confirmation of receipt for a purchase order. */
export const VendorAcknowledgeSchema = Type.Object({
  note: Type.Optional(Type.String()),
});
export type VendorAcknowledge = Static<typeof VendorAcknowledgeSchema>;
