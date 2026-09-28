// Slug style matches the other mounted routes (udit.view, users.manage,
// settings.manage) so a tenant grants them like the rest.
export const policiesPermissions = {
  read: 'policies.view',
  write: 'policies.manage',
} as const;
