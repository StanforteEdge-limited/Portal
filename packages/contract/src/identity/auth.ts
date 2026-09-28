import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema, IdSchema, PasswordSchema } from '../common/primitives';
import { OrganizationRefSchema, TenantRefSchema } from '../common/refs';

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

export const LoginSchema = Type.Object({
  email: EmailSchema,
  /**
   * Deliberately weaker than `PasswordSchema`. Login has to accept whatever hash
   * is already on the account, including passwords stored before the policy
   * tightened to 8 characters. The rule is enforced where passwords are *set*
   * (create user, change, reset, accept invite).
   */
  password: Type.String({ minLength: 6 }),
  /** Organization code to sign in to, when the account spans several. */
  organization: Type.Optional(Type.String()),
});
export type Login = Static<typeof LoginSchema>;

/**
 * The refresh token is normally read from the httpOnly cookie the server set at
 * login, so the body field is only a fallback for clients that cannot hold
 * cookies.
 */
export const RefreshSchema = Type.Object({
  refresh_token: Type.Optional(Type.String()),
});
export type Refresh = Static<typeof RefreshSchema>;

export const ForgotPasswordSchema = Type.Object({
  email: EmailSchema,
});
export type ForgotPassword = Static<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = Type.Object({
  token: Type.String(),
  new_password: PasswordSchema,
});
export type ResetPassword = Static<typeof ResetPasswordSchema>;

export const AcceptInviteSchema = Type.Object({
  token: Type.String(),
  new_password: PasswordSchema,
  /** Must match `new_password` when supplied; checked in the service. */
  confirm_password: Type.Optional(PasswordSchema),
});
export type AcceptInvite = Static<typeof AcceptInviteSchema>;

export const ChangePasswordSchema = Type.Object({
  /** Only length-checked: it is compared against the stored hash, not validated. */
  current_password: Type.String(),
  new_password: PasswordSchema,
  /** Must match `new_password` when supplied; checked in the service. */
  confirm_password: Type.Optional(PasswordSchema),
});
export type ChangePassword = Static<typeof ChangePasswordSchema>;

export const SwitchTenantSchema = Type.Object({
  tenant_id: IdSchema,
});
export type SwitchTenant = Static<typeof SwitchTenantSchema>;

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The principal returned by `/login`. Note the absence of tokens: they are set
 * as httpOnly cookies and are never part of the JSON body.
 */
export const AuthUserSchema = Type.Object({
  id: IdSchema,
  email: Type.String(),
  first_name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  last_name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  roles: Type.Array(Type.String()),
  permissions: Type.Array(Type.String()),
  organization: Type.Optional(OrganizationRefSchema),
  tenant: Type.Optional(TenantRefSchema),
});
export type AuthUser = Static<typeof AuthUserSchema>;

export const LoginResponseSchema = Type.Object({
  user: AuthUserSchema,
});
export type LoginResponse = Static<typeof LoginResponseSchema>;

/**
 * The principal returned by `/status`. Superset of {@link AuthUser}: it adds the
 * account status and onboarding progress, and reports the tenant but not the
 * organization.
 */
export const AuthStatusResponseSchema = Type.Object({
  id: IdSchema,
  email: Type.String(),
  first_name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  last_name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  status: Type.String(),
  roles: Type.Array(Type.String()),
  permissions: Type.Array(Type.String()),
  onboarding_status: Type.Optional(Type.String()),
  tenant: Type.Optional(TenantRefSchema),
});
export type AuthStatusResponse = Static<typeof AuthStatusResponseSchema>;

/**
 * The token pair the server issues internally. It is *not* part of any response
 * body — both tokens are delivered as httpOnly cookies — and exists so the
 * issuing code and its callers can name the shape.
 */
export const AuthTokensSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  expiresIn: Type.String(),
});
export type AuthTokens = Static<typeof AuthTokensSchema>;
