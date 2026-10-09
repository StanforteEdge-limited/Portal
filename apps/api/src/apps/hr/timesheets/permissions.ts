// Slug style matches the other mounted routes (udit.view, users.manage,
// settings.manage) so a tenant grants them like the rest.
export const timesheetsPermissions = {
  read: 'timesheets.view',
  write: 'timesheets.manage',
} as const;
