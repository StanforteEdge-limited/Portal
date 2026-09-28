// Slug style matches the other mounted routes (`audit.view`, `users.manage`,
// `settings.manage`) so a tenant grants them like the rest.
export const departmentsPermissions = {
  read: 'departments.view',
  write: 'departments.manage',
} as const;
