import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRoutes } from '$app/bootstrap/routes';
import { JwtService } from '$core/auth/jwt.service';

const protectedEndpoints = [
  '/v1/profile',
  '/v1/users',
  '/v1/admin/users',
  '/v1/admin/rbac/roles',
  '/v1/audit',
  '/v1/employees',
  '/v1/hr/summary',
  '/v1/hr/attendance/status',
  '/v1/hr/designations',
  '/v1/hr/leave/balance',
  '/v1/hr/organizations',
  '/v1/hr/onboarding',
  '/v1/hr/policies',
  '/v1/hr/projects',
  '/v1/hr/tasks',
  '/v1/hr/timesheets',
  '/v1/hr/documents',
  '/v1/hr/forms',
  '/v1/hr/taxonomy',
  '/v1/hr/workflow',
  '/v1/hr/departments',
  '/v1/groups',
  '/v1/tenancy',
];

const moduleEndpoints = [
  ['GET', '/v1/health/healthz'],
  ['POST', '/v1/auth/login'],
  ['GET', '/v1/admin/users'],
  ['GET', '/v1/admin/rbac/roles'],
  ['GET', '/v1/audit'],
  ['GET', '/v1/employees'],
  ['GET', '/v1/attendance/status'],
  ['GET', '/v1/leave/balance'],
  ['GET', '/v1/acknowledgements/mine'],
  ['GET', '/v1/notifications/unread-count'],
  ['GET', '/v1/onboarding'],
  ['GET', '/v1/policies'],
  ['GET', '/v1/organizations'],
  ['GET', '/v1/designations'],
  ['GET', '/v1/projects'],
  ['GET', '/v1/tasks/my/items'],
  ['GET', '/v1/timesheets/my/summary'],
  ['GET', '/v1/documents'],
  ['GET', '/v1/forms'],
  ['GET', '/v1/taxonomy'],
  ['POST', '/v1/workflow/instances'],
  ['GET', '/v1/departments'],
  ['GET', '/v1/groups'],
  ['GET', '/v1/tenancy'],
] as const;

function testContainer() {
  return {
    jwt: new JwtService({ secret: 'route-test-secret' }),
    auth: { validateJwtPayload: async () => null },
    tenantContext: {
      enter: () => undefined,
      run: async (_context: unknown, operation: () => unknown) => operation(),
      runSystem: async (_operation: string, operation: () => unknown) => operation(),
    },
  } as any;
}

async function buildRouteApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.decorate('container', testContainer());

  for (const route of appRoutes) {
    await app.register(route.plugin, { prefix: `/v1${route.prefix}` });
  }

  await app.ready();
  return app;
}

describe('API route modules', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildRouteApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers every endpoint module without route conflicts', async () => {
    for (const [method, url] of moduleEndpoints) {
      expect(app.hasRoute({ method, url })).toBe(true);
    }
  });

  it.each(protectedEndpoints)('protects %s from anonymous access', async (url) => {
    const response = await app.inject({ method: 'GET', url });

    expect(response.statusCode).toBe(401);
  });

  it('keeps health and workspace registration public', async () => {
    const health = await app.inject({ method: 'GET', url: '/v1/health/healthz' });
    expect(health.statusCode).toBe(200);

    const registration = await app.inject({
      method: 'POST',
      url: '/v1/tenancy/workspaces',
      payload: {},
    });
    expect(registration.statusCode).toBe(400);
  });
});
