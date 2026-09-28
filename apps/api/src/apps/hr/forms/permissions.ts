// Slug style matches the other mounted routes (udit.view, users.manage,
// settings.manage) so a tenant grants them like the rest.
export const formsPermissions = {
  read: 'forms.view',
  write: 'forms.manage',
} as const;
