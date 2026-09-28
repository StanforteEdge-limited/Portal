import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CookieOptions, Response } from 'express';
import { serializeCookie } from '$core/auth/cookies';

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
 * Services declare their `res` parameter as an Express `Response`, but only ever
 * touch `cookie`, `clearCookie` and `redirect` on it (everything else named
 * `res` in the codebase is a `fetch` response). This is the Fastify reply
 * narrowed to that surface, so those calls typecheck unchanged.
 *
 * The cast is deliberate: the runtime object implements three of Express's
 * response methods, and widening it to the full interface keeps the migrated
 * service signatures untouched.
 */
export type ServiceResponse = FastifyReply & Response;

function appendSetCookie(reply: FastifyReply, serialized: string): void {
  const existing = reply.raw.getHeader('set-cookie');
  const list = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
  reply.raw.setHeader('set-cookie', [...list, serialized]);
}

/**
 * Services were written against the Express `Response` object, so handlers pass
 * this adapter instead: `cookie`/`clearCookie` map onto the Fastify reply and
 * `redirect` short-circuits the handler by ending the reply.
 */
export function responseAdapter(reply: FastifyReply): ServiceResponse {
  return Object.assign(reply, {
    cookie: (name: string, value: string, options: Record<string, unknown> = {}) => {
      appendSetCookie(reply, serializeCookie(name, value, options as CookieOptions));
    },
    clearCookie: (name: string, options: Record<string, unknown> = {}) => {
      const { maxAge, expires, ...rest } = options as CookieOptions;
      appendSetCookie(reply, serializeCookie(name, '', { ...rest, maxAge: 0, expires: new Date(0) }));
    },
    redirect: (url: string, code?: number) => reply.redirect(url, code),
  }) as unknown as ServiceResponse;
}
