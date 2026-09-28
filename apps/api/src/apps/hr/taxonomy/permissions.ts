// Slug style matches the other mounted routes (udit.view, users.manage,
// settings.manage) so a tenant grants them like the rest.
export const taxonomyPermissions = {
  read: 'taxonomy.view',
  write: 'taxonomy.manage',
} as const;
