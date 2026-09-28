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
import { DocumentsRoutes } from '$apps/hr/documents/routes';
import { FormsRoutes } from '$apps/hr/forms/routes';
import { TaxonomyRoutes } from '$apps/hr/taxonomy/routes';
import { WorkflowRoutes } from '$apps/hr/workflow/routes';
import { DepartmentsRoutes } from '$apps/hr/departments/routes';

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
  { prefix: '/designations', plugin: DesignationsRoutes },
  { prefix: '/leave', plugin: LeaveRoutes },
  { prefix: '/acknowledgements', plugin: AcknowledgementsRoutes },
  { prefix: '/notifications', plugin: NotificationsRoutes },
  { prefix: '/onboarding', plugin: OnboardingRoutes },
  { prefix: '/policies', plugin: PoliciesRoutes },
  { prefix: '/organizations', plugin: OrganizationsRoutes },
  { prefix: '/projects', plugin: ProjectsRoutes },
  { prefix: '/documents', plugin: DocumentsRoutes },
  { prefix: '/forms', plugin: FormsRoutes },
  { prefix: '/taxonomy', plugin: TaxonomyRoutes },
  { prefix: '/workflow', plugin: WorkflowRoutes },
  { prefix: '/departments', plugin: DepartmentsRoutes },
];
