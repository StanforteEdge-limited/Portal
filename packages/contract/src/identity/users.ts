import { Type, type Static } from '@sinclair/typebox';
import {
  EmailSchema,
  IdSchema,
  IsoDateSchema,
  LongTextSchema,
  PaginationQuerySchema,
  PaginatedListSchema,
  PasswordSchema,
  ShortTextSchema,
  UuidSchema,
} from '../common/primitives';

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

/** Lifecycle status a user can be moved to by an administrator. */
export const UserStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('inactive'),
  Type.Literal('suspended'),
  Type.Literal('deleted'),
]);
export type UserStatus = Static<typeof UserStatusSchema>;

/**
 * Every status a profile can actually hold, including `pending` (invited but
 * never signed in). Broader than `UserStatusSchema` because that one enumerates
 * only the values an admin may *set*; this one is for filtering, where the
 * caller must be able to narrow down to any existing account.
 */
export const ProfileStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('pending'),
  Type.Literal('inactive'),
  Type.Literal('suspended'),
  Type.Literal('deleted'),
]);
export type ProfileStatus = Static<typeof ProfileStatusSchema>;

/**
 * Status accepted at creation time. A new account can only be `active` or
 * `pending` (invited but never signed in) — the wider lifecycle is reachable
 * only through `UpdateUserStatusSchema`.
 */
export const NewUserStatusSchema = Type.Union([Type.Literal('active'), Type.Literal('pending')]);
export type NewUserStatus = Static<typeof NewUserStatusSchema>;

/**
 * Account class. The `profile.type` column is free-text `varchar(50)` and
 * tenants may introduce their own classes, so this stays an open string rather
 * than an enum — validating it as a union would reject accounts that already
 * exist in the database.
 *
 * `KNOWN_USER_TYPES` is the canonical list for UI pickers and is what the
 * service falls back to (`staff`) when the field is omitted.
 */
export const UserTypeSchema = Type.String({ minLength: 1, maxLength: 50 });
export type UserType = Static<typeof UserTypeSchema>;

export const KNOWN_USER_TYPES = ['staff', 'vendor', 'client', 'board_member'] as const;
export type KnownUserType = (typeof KNOWN_USER_TYPES)[number];

export const DEFAULT_USER_TYPE: UserType = 'staff';

/* -------------------------------------------------------------------------- */
/* Params & query                                                             */
/* -------------------------------------------------------------------------- */

export const UserIdParamsSchema = Type.Object({
  id: IdSchema,
});
export type UserIdParams = Static<typeof UserIdParamsSchema>;

export const UsersListQuerySchema = Type.Intersect([
  PaginationQuerySchema,
  Type.Object({
    status: Type.Optional(ProfileStatusSchema),
    type: Type.Optional(UserTypeSchema),
    organization_id: Type.Optional(IdSchema),
  }),
]);
export type UsersListQuery = Static<typeof UsersListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

export const CreateUserSchema = Type.Object({
  username: Type.Optional(ShortTextSchema),
  email: EmailSchema,
  /** Required when `set_password` is true; validated in the service. */
  password: Type.Optional(PasswordSchema),
  first_name: Type.Optional(ShortTextSchema),
  last_name: Type.Optional(ShortTextSchema),
  type: Type.Optional(UserTypeSchema),
  status: Type.Optional(NewUserStatusSchema),
  roles: Type.Optional(Type.Array(Type.String())),
  primary_organization_id: Type.Optional(IdSchema),
  /** Opt in to storing `password` for immediate login. */
  set_password: Type.Optional(Type.Boolean()),
  /** Send an invite email containing a password-setup link. */
  send_invite: Type.Optional(Type.Boolean()),
  /** Send the standard welcome email after the account is created. */
  send_welcome_email: Type.Optional(Type.Boolean()),
});
export type CreateUser = Static<typeof CreateUserSchema>;

export const UpdateUserSchema = Type.Object({
  username: Type.Optional(ShortTextSchema),
  email: Type.Optional(EmailSchema),
  password: Type.Optional(PasswordSchema),
  set_password: Type.Optional(Type.Boolean()),
  first_name: Type.Optional(ShortTextSchema),
  last_name: Type.Optional(ShortTextSchema),
  type: Type.Optional(UserTypeSchema),
  status: Type.Optional(NewUserStatusSchema),
  primary_organization_id: Type.Optional(IdSchema),
  send_invite: Type.Optional(Type.Boolean()),
  send_welcome_email: Type.Optional(Type.Boolean()),
});
export type UpdateUser = Static<typeof UpdateUserSchema>;

export const UpdateProfileSchema = Type.Object({
  first_name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  last_name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  date_of_birth: Type.Optional(IsoDateSchema),
  gender: Type.Optional(Type.String({ maxLength: 20 })),
  phone: Type.Optional(Type.String({ maxLength: 30 })),
  address: Type.Optional(Type.String({ maxLength: 255 })),
  nationality: Type.Optional(Type.String({ maxLength: 100 })),
  state: Type.Optional(Type.String({ maxLength: 100 })),
  lga: Type.Optional(Type.String({ maxLength: 100 })),
  marital_status: Type.Optional(Type.String({ maxLength: 30 })),
  avatar: Type.Optional(Type.String({ maxLength: 255 })),
  bio: Type.Optional(LongTextSchema),
  occupation: Type.Optional(Type.String({ maxLength: 100 })),
  signature_file_id: Type.Optional(UuidSchema),
});
export type UpdateProfile = Static<typeof UpdateProfileSchema>;

export const InviteUserSchema = Type.Object({
  message: Type.Optional(Type.String({ maxLength: 500 })),
});
export type InviteUser = Static<typeof InviteUserSchema>;

/** Replaces the full role set for a user. Also used as the body for reset-link. */
export const AssignUserRolesSchema = Type.Object({
  roles: Type.Array(Type.String(), { minItems: 1 }),
});
export type AssignUserRoles = Static<typeof AssignUserRolesSchema>;

/* -------------------------------------------------------------------------- */
/* Admin commands                                                             */
/* -------------------------------------------------------------------------- */

export const CreateAdminUserSchema = Type.Object({
  username: Type.Optional(ShortTextSchema),
  email: EmailSchema,
  password: Type.Optional(PasswordSchema),
  first_name: Type.Optional(ShortTextSchema),
  last_name: Type.Optional(ShortTextSchema),
  type: Type.Optional(UserTypeSchema),
  status: Type.Optional(ProfileStatusSchema),
  organization_id: Type.Optional(IdSchema),
  primary_organization_id: Type.Optional(IdSchema),
  roles: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  send_invite: Type.Optional(Type.Boolean()),
});
export type CreateAdminUser = Static<typeof CreateAdminUserSchema>;

export const BulkCreateUsersSchema = Type.Object({
  users: Type.Array(CreateAdminUserSchema),
});
export type BulkCreateUsers = Static<typeof BulkCreateUsersSchema>;

export const UpdateAdminUserSchema = Type.Object({
  username: Type.Optional(ShortTextSchema),
  email: Type.Optional(EmailSchema),
  first_name: Type.Optional(ShortTextSchema),
  last_name: Type.Optional(ShortTextSchema),
  type: Type.Optional(UserTypeSchema),
  status: Type.Optional(ProfileStatusSchema),
  password: Type.Optional(PasswordSchema),
  organization_id: Type.Optional(IdSchema),
  primary_organization_id: Type.Optional(IdSchema),
});
export type UpdateAdminUser = Static<typeof UpdateAdminUserSchema>;

export const UpdateUserStatusSchema = Type.Object({
  status: UserStatusSchema,
});
export type UpdateUserStatus = Static<typeof UpdateUserStatusSchema>;

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

export const OrganizationRefSchema = Type.Object({
  id: IdSchema,
  name: Type.String(),
  code: Type.Optional(Type.String()),
  is_primary: Type.Optional(Type.Boolean()),
});
export type OrganizationRef = Static<typeof OrganizationRefSchema>;

export const NamedGroupRefSchema = Type.Object({
  id: IdSchema,
  name: Type.String(),
  type: Type.Optional(Type.String()),
  role: Type.Optional(Type.String()),
  is_primary: Type.Optional(Type.Boolean()),
});
export type NamedGroupRef = Static<typeof NamedGroupRefSchema>;

export const AdminUserSchema = Type.Object({
  id: IdSchema,
  username: Type.Union([ShortTextSchema, Type.Null()]),
  email: Type.String(),
  type: Type.String(),
  status: Type.String(),
  first_name: Type.Union([Type.String(), Type.Null()], { default: null }),
  last_name: Type.Union([Type.String(), Type.Null()], { default: null }),
  created_at: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  primary_organization_id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  primary_organization: Type.Union([OrganizationRefSchema, Type.Null()], { default: null }),
  organizations: Type.Optional(Type.Array(OrganizationRefSchema)),
});
export type AdminUser = Static<typeof AdminUserSchema>;

export const AdminUserRoleSchema = Type.Object({
  id: IdSchema,
  slug: Type.String(),
  name: Type.String(),
  is_primary: Type.Optional(Type.Boolean()),
});
export type AdminUserRole = Static<typeof AdminUserRoleSchema>;

export const AdminUserDetailSchema = Type.Intersect([
  AdminUserSchema,
  Type.Object({
    roles: Type.Optional(Type.Array(AdminUserRoleSchema)),
  }),
]);
export type AdminUserDetail = Static<typeof AdminUserDetailSchema>;

export const AdminUsersResponseSchema = PaginatedListSchema(AdminUserSchema);
export type AdminUsersResponse = Static<typeof AdminUsersResponseSchema>;

export const RoleOptionSchema = Type.Object({
  id: IdSchema,
  slug: Type.String(),
  name: Type.String(),
});
export type RoleOption = Static<typeof RoleOptionSchema>;

export const UserRolesResponseSchema = Type.Object({
  user: Type.Object({
    id: IdSchema,
    email: Type.String(),
  }),
  roles: Type.Array(AdminUserRoleSchema),
});
export type UserRolesResponse = Static<typeof UserRolesResponseSchema>;

/** The signed-in user's own profile. Every personal column is nullable. */
export const ProfileResponseSchema = Type.Object({
  id: IdSchema,
  username: Type.Union([Type.String(), Type.Null()]),
  email: Type.String(),
  type: Type.String(),
  status: Type.String(),
  first_name: Type.Union([Type.String(), Type.Null()], { default: null }),
  last_name: Type.Union([Type.String(), Type.Null()], { default: null }),
  phone: Type.Union([Type.String(), Type.Null()], { default: null }),
  address: Type.Union([Type.String(), Type.Null()], { default: null }),
  date_of_birth: Type.Union([Type.String(), Type.Null()], { default: null }),
  gender: Type.Union([Type.String(), Type.Null()], { default: null }),
  nationality: Type.Union([Type.String(), Type.Null()], { default: null }),
  state: Type.Union([Type.String(), Type.Null()], { default: null }),
  lga: Type.Union([Type.String(), Type.Null()], { default: null }),
  marital_status: Type.Union([Type.String(), Type.Null()], { default: null }),
  bio: Type.Union([Type.String(), Type.Null()], { default: null }),
  occupation: Type.Union([Type.String(), Type.Null()], { default: null }),
  avatar: Type.Union([Type.String(), Type.Null()], { default: null }),
  primary_organization_id: Type.Union([Type.String(), Type.Null()], { default: null }),
  created_at: Type.Union([Type.String(), Type.Null()]),
  updated_at: Type.Union([Type.String(), Type.Null()]),
  organizations: Type.Array(OrganizationRefSchema),
  groups: Type.Optional(Type.Array(NamedGroupRefSchema)),
  teams: Type.Optional(Type.Array(NamedGroupRefSchema)),
  projects: Type.Optional(Type.Array(NamedGroupRefSchema)),
  employee_profile: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  onboarding_progress: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  signature_url: Type.Union([Type.String(), Type.Null()], { default: null }),
});
export type ProfileResponse = Static<typeof ProfileResponseSchema>;
