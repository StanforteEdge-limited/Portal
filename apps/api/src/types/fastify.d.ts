import type { Container } from '../bootstrap/container';
import type { TenantContext } from '$core/auth/tenant-context';

declare module 'fastify' {
  interface FastifyInstance {
    container: Container;
  }

  interface FastifyRequest {
    user?: Record<string, any>;
    tenant?: TenantContext;
    vendor?: Record<string, any>;
  }
}
