import type { CookieOptions } from 'express';

export const AUTH_ACCESS_COOKIE = 'se_access_token';
export const AUTH_REFRESH_COOKIE = 'se_refresh_token';

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

export function authCookieOptions(maxAgeSeconds?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: typeof maxAgeSeconds === 'number' ? maxAgeSeconds * 1000 : undefined
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/'
  };
}

export function parseCookieHeader(cookieHeader?: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, segment) => {
    const index = segment.indexOf('=');
    if (index === -1) return acc;
    const key = segment.slice(0, index).trim();
    const value = segment.slice(index + 1).trim();
    if (!key) return acc;
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function serializeSameSite(sameSite: unknown): string | null {
  if (sameSite === true) return 'Strict';
  if (!sameSite) return null;
  const value = String(sameSite).toLowerCase();
  if (value === 'lax' || value === 'strict' || value === 'none') {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return null;
}

/**
 * Serializes an Express `CookieOptions` object into a `Set-Cookie` value. The
 * project has no `@fastify/cookie` dependency, so the reply header is written
 * directly by the response adapter.
 */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value ?? '')}`];

  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.path) parts.push(`Path=${options.path}`);

  const maxAge = options.maxAge;
  if (typeof maxAge === 'number' && Number.isFinite(maxAge)) {
    parts.push(`Max-Age=${Math.floor(maxAge / 1000)}`);
  }

  const expires = options.expires;
  if (expires) {
    const date = expires instanceof Date ? expires : new Date(String(expires));
    if (!Number.isNaN(date.getTime())) parts.push(`Expires=${date.toUTCString()}`);
  }

  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');

  const sameSite = serializeSameSite(options.sameSite);
  if (sameSite) parts.push(`SameSite=${sameSite}`);

  if (options.priority) {
    const priority = String(options.priority).toLowerCase();
    if (priority === 'low') parts.push('Priority=Low');
    else if (priority === 'medium') parts.push('Priority=Medium');
    else if (priority === 'high') parts.push('Priority=High');
  }
  if ((options as { partitioned?: boolean }).partitioned) parts.push('Partitioned');

  return parts.join('; ');
}

