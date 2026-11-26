import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { CookieOptions } from '$core/auth/cookies';
import { currentTenant } from '$core/auth/guards';

export function requestBody<T = Record<string, unknown>>(request: FastifyRequest): T {
  return (request.body ?? {}) as T;
}

export function requestParams<T = Record<string, unknown>>(request: FastifyRequest): T {
  return (request.params ?? {}) as T;
}

export function requestQuery<T = Record<string, unknown>>(request: FastifyRequest): T {
  return (request.query ?? {}) as T;
}

/**
 * Extract the authenticated user's ID in a consistent string form.
 */
export function authenticatedUserId(request: FastifyRequest): string {
  const id = (request.user as { id?: string | number | bigint } | undefined)?.id;
  return id !== undefined && id !== null ? String(id) : '';
}

/**
 * Execute a handler operation within the current request's tenant AsyncLocalStorage context.
 */
export function runInTenant<T>(
  fastify: FastifyInstance,
  request: FastifyRequest,
  op: () => Promise<T> | T,
): Promise<T> | T {
  return fastify.container.tenantContext.run(currentTenant(request), op);
}

/**
 * Normalize a Drizzle row by converting BigInt values to strings and exposing
 * both camelCase and snake_case keys for API contract compatibility.
 */
export function serializeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const val = typeof v === 'bigint' ? v.toString() : v;
    out[k] = val;
    const snake = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    if (snake !== k) out[snake] = val;
  }
  return out;
}

/**
 * Build a standard paginated envelope for Drizzle list queries.
 */
export function paginateRows(rows: Record<string, any>[], query: Record<string, any>) {
  const page = Math.max(1, Number(query.page || 1));
  const perPage = Math.min(200, Math.max(1, Number(query.per_page || 50)));
  const total = rows.length;
  const start = (page - 1) * perPage;
  const items = rows.slice(start, start + perPage).map(serializeRow);
  return {
    items,
    result: items,
    total,
    meta: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)) },
  };
}

/**
 * Services only need the Fastify cookie and redirect response surface.
 */
export type ServiceResponse = Omit<FastifyReply, 'cookie' | 'clearCookie' | 'redirect'> & {
  cookie(name: string, value: string, options?: CookieOptions): FastifyReply;
  clearCookie(name: string, options?: CookieOptions): FastifyReply;
  redirect(url: string, code?: number): FastifyReply;
};

/**
 * Handlers pass this narrowed Fastify reply to services that need to write auth
 * cookies or redirect after OAuth callbacks.
 */
export function responseAdapter(reply: FastifyReply): ServiceResponse {
  return reply as unknown as ServiceResponse;
}
