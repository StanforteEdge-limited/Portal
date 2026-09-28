import type { FastifyPluginAsync } from 'fastify';
import { HealthRoutes } from '$apps/platform/health';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { AdminRoutes, UsersRoutes } from '$apps/identity/users/routes';
import { RbacRoutes } from '$apps/identity/rbac/routes';
import { AuditRoutes } from '$apps/identity/audit/routes';

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
];
