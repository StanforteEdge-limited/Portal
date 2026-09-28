import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CookieOptions } from '$core/auth/cookies';

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
