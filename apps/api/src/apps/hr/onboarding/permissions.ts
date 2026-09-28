// Slug style matches the other mounted routes (udit.view, users.manage,
// settings.manage) so a tenant grants them like the rest.
export const onboardingPermissions = {
  read: 'onboarding.view',
  write: 'onboarding.manage',
} as const;
