import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { httpPlugin } from '$plugins/http';
import { Container } from '$app/bootstrap/container';
import type { TestDb } from './pg';

export const TEST_API_PREFIX = '/v1';

/**
 * Builds a real Fastify instance (cookies, container, envelope, error handler)
 * wired to the in-process Postgres, then mounts the given route plugins.
 * `inject` exercises the full HTTP stack without opening a socket.
 */
export async function buildTestApp(
  db: TestDb,
  routes: { prefix: string; plugin: any }[],
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.decorate('db', db);
  await app.register(fastifyCookie);
  app.register(httpPlugin);
  // `httpPlugin` owns the container in production; tests keep a handle so they
  // can assert on the same singletons the routes use.
  app.addHook('onReady', async () => {
    testContainer = app.container;
  });

  for (const { prefix, plugin } of routes) {
    app.register(plugin, { prefix: `${TEST_API_PREFIX}${prefix}` });
  }

  await app.ready();
  return app;
}

let testContainer: Container | undefined;

/** The container built by the most recent {@link buildTestApp} call. */
export function appContainer(): Container {
  if (!testContainer) throw new Error('Container requested before the test app was built');
  return testContainer;
}
