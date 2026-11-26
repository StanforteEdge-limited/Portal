import type { FastifyPluginAsync } from 'fastify';
import { HealthRoutes } from '$apps/platform/health';
import { BillingRoutes } from '$apps/platform/billing';
import { CeoPlatformRoutes, PublicContactRoutes } from '$apps/platform/ceo/routes';
import { MailRoutes } from '$apps/communication/mail';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { AdminRoutes, UsersRoutes } from '$apps/identity/users/routes';
import { RbacRoutes } from '$apps/identity/rbac/routes';
import { AuditRoutes } from '$apps/identity/audit/routes';
import { EmployeesRoutes } from '$apps/hr/employees/routes';
import { DesignationsRoutes } from '$apps/hr/designations/routes';
import { LeaveRoutes } from '$apps/hr/leave/routes';
import { AcknowledgementsRoutes } from '$apps/hr/acknowledgements/routes';
import { NotificationsRoutes } from '$apps/hr/notifications/routes';
import { OnboardingRoutes } from '$apps/hr/onboarding/routes';
import { PoliciesRoutes } from '$apps/hr/policies/routes';
import { OrganizationsRoutes } from '$apps/hr/organizations/routes';
import { ProjectsRoutes } from '$apps/hr/projects/routes';
import { TasksRoutes } from '$apps/hr/tasks/routes';
import { TimesheetRoutes } from '$apps/hr/timesheets/routes';
import { DocumentsRoutes } from '$apps/hr/documents/routes';
import { FormsRoutes } from '$apps/hr/forms/routes';
import { TaxonomyRoutes } from '$apps/hr/taxonomy/routes';
import { WorkflowRoutes } from '$apps/hr/workflow/routes';
import { DepartmentsRoutes } from '$apps/hr/departments/routes';
import { AttendanceRoutes } from '$apps/hr/attendance/routes';
import { PayrollRoutes } from '$apps/hr/payroll/routes';
import { RequestsRoutes } from '$apps/hr/requests/routes';
import { FinanceRoutes } from '$apps/finance/accounting/routes';
import { ProcurementRoutes } from '$apps/finance/procurement/routes';
import { GroupsRoutes } from '$apps/communication/groups/routes';
import { ChatRoutes } from '$apps/communication/chat/routes';
import { StorageRoutes } from '$apps/storage/routes';
import { TenancyRoutes } from '$apps/tenancy/routes';

export interface AppRoute {
  prefix: string;
  plugin: FastifyPluginAsync;
}

/** Mount a single plugin under one or more URL prefixes without repeating definitions. */
function mount(plugin: FastifyPluginAsync, ...prefixes: string[]): AppRoute[] {
  return prefixes.map((prefix) => ({ prefix, plugin }));
}

/**
 * HR & Workforce modules exposed at both root (`/employees`, `/leave`, ...)
 * and `/hr/*` aliases (`/hr/employees`, `/hr/leave`, ...) for web/desktop clients.
 */
const hrModules: Array<[string, FastifyPluginAsync]> = [
  ['/employees', EmployeesRoutes],
  ['/attendance', AttendanceRoutes],
  ['/designations', DesignationsRoutes],
  ['/leave', LeaveRoutes],
  ['/acknowledgements', AcknowledgementsRoutes],
  ['/notifications', NotificationsRoutes],
  ['/onboarding', OnboardingRoutes],
  ['/policies', PoliciesRoutes],
  ['/organizations', OrganizationsRoutes],
  ['/projects', ProjectsRoutes],
  ['/tasks', TasksRoutes],
  ['/timesheets', TimesheetRoutes],
  ['/documents', DocumentsRoutes],
  ['/forms', FormsRoutes],
  ['/taxonomy', TaxonomyRoutes],
  ['/workflow', WorkflowRoutes],
  ['/departments', DepartmentsRoutes],
  ['/payroll', PayrollRoutes],
  ['/requests', RequestsRoutes],
];

/** Fastify route plugins mounted under the global `/v1` prefix. */
export const appRoutes: AppRoute[] = [
  // Platform & Identity
  ...mount(HealthRoutes, '/health'),
  ...mount(BillingRoutes, '/billing'),
  ...mount(CeoPlatformRoutes, '/ceo'),
  ...mount(PublicContactRoutes, '/platform'),
  ...mount(AuthRoutes, '/auth'),
  ...mount(UsersRoutes, ''),
  ...mount(AdminRoutes, '/admin/users'),
  ...mount(RbacRoutes, '/admin/rbac', '/auth/roles'),
  ...mount(AuditRoutes, '/audit'),
  ...mount(TenancyRoutes, '/tenancy', '/tenants'),

  // HR & Workforce (root + /hr/* aliases generated from a single source of truth)
  ...mount(EmployeesRoutes, '/hr'),
  ...hrModules.flatMap(([path, plugin]) => mount(plugin, path, `/hr${path}`)),

  // Finance & Procurement
  ...mount(FinanceRoutes, '/finance'),
  ...mount(ProcurementRoutes, '/procurement'),

  // Storage & Communication
  ...mount(StorageRoutes, '/files', '/storage'),
  ...mount(ChatRoutes, '/chat', '/communication/chat'),
  ...mount(GroupsRoutes, '/groups'),
  ...mount(MailRoutes, '/mail'),
];
