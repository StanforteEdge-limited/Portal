// Slug style matches the other mounted routes (`audit.view`, `audit.manage`,
// `users.manage`, `settings.manage`) so a tenant grants them like the rest.
export const employeesPermissions = {
  read: 'employees.view',
  write: 'employees.manage',
} as const;
