// Slug style matches the other mounted routes (udit.view, users.manage,
// settings.manage) so a tenant grants them like the rest.
export const organizationsPermissions = {
  read: 'organizations.view',
  write: 'organizations.manage',
} as const;
