import type { FastifyPluginAsync } from 'fastify';
import { HealthRoutes } from '$apps/platform/health';
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
import { GroupsRoutes } from '$apps/communication/groups/routes';
import { ChatRoutes } from '$apps/communication/chat/routes';
import { StorageRoutes } from '$apps/storage/routes';
import { TenancyRoutes } from '$apps/tenancy/routes';

export interface AppRoute {
  prefix: string;
  plugin: FastifyPluginAsync;
}

/** Fastify route plugins mounted under the global `/v1` prefix. */
export const appRoutes: AppRoute[] = [
  { prefix: '/health', plugin: HealthRoutes },
  { prefix: '/auth', plugin: AuthRoutes },
  { prefix: '', plugin: UsersRoutes },
  { prefix: '/admin/users', plugin: AdminRoutes },
  { prefix: '/admin/rbac', plugin: RbacRoutes },
  { prefix: '/audit', plugin: AuditRoutes },
  { prefix: '/employees', plugin: EmployeesRoutes },
  { prefix: '/attendance', plugin: AttendanceRoutes },
  { prefix: '/designations', plugin: DesignationsRoutes },
  { prefix: '/leave', plugin: LeaveRoutes },
  { prefix: '/acknowledgements', plugin: AcknowledgementsRoutes },
  { prefix: '/notifications', plugin: NotificationsRoutes },
  { prefix: '/onboarding', plugin: OnboardingRoutes },
  { prefix: '/policies', plugin: PoliciesRoutes },
  { prefix: '/organizations', plugin: OrganizationsRoutes },
  { prefix: '/projects', plugin: ProjectsRoutes },
  { prefix: '/tasks', plugin: TasksRoutes },
  { prefix: '/timesheets', plugin: TimesheetRoutes },
  { prefix: '/documents', plugin: DocumentsRoutes },
  { prefix: '/forms', plugin: FormsRoutes },
  { prefix: '/taxonomy', plugin: TaxonomyRoutes },
  { prefix: '/workflow', plugin: WorkflowRoutes },
  { prefix: '/departments', plugin: DepartmentsRoutes },
  { prefix: '/payroll', plugin: PayrollRoutes },
  { prefix: '/requests', plugin: RequestsRoutes },
  // Files / Storage
  { prefix: '/files', plugin: StorageRoutes },
  { prefix: '/storage', plugin: StorageRoutes },
  // Communication
  { prefix: '/chat', plugin: ChatRoutes },
  { prefix: '/communication/chat', plugin: ChatRoutes },
  { prefix: '/groups', plugin: GroupsRoutes },
  // HR-prefixed aliases used by the web and desktop clients. Keep the
  // existing root routes above for backwards compatibility.
  { prefix: '/hr', plugin: EmployeesRoutes },
  { prefix: '/hr/employees', plugin: EmployeesRoutes },
  { prefix: '/hr/attendance', plugin: AttendanceRoutes },
  { prefix: '/hr/designations', plugin: DesignationsRoutes },
  { prefix: '/hr/leave', plugin: LeaveRoutes },
  { prefix: '/hr/acknowledgements', plugin: AcknowledgementsRoutes },
  { prefix: '/hr/notifications', plugin: NotificationsRoutes },
  { prefix: '/hr/onboarding', plugin: OnboardingRoutes },
  { prefix: '/hr/policies', plugin: PoliciesRoutes },
  { prefix: '/hr/organizations', plugin: OrganizationsRoutes },
  { prefix: '/hr/projects', plugin: ProjectsRoutes },
  { prefix: '/hr/tasks', plugin: TasksRoutes },
  { prefix: '/hr/timesheets', plugin: TimesheetRoutes },
  { prefix: '/hr/documents', plugin: DocumentsRoutes },
  { prefix: '/hr/forms', plugin: FormsRoutes },
  { prefix: '/hr/taxonomy', plugin: TaxonomyRoutes },
  { prefix: '/hr/workflow', plugin: WorkflowRoutes },
  { prefix: '/hr/departments', plugin: DepartmentsRoutes },
  { prefix: '/hr/payroll', plugin: PayrollRoutes },
  { prefix: '/hr/requests', plugin: RequestsRoutes },
  { prefix: '/tenancy', plugin: TenancyRoutes },
  { prefix: '/tenants', plugin: TenancyRoutes },
  { prefix: '/finance', plugin: FinanceRoutes },
];
