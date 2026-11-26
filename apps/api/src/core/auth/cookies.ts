export interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  partitioned?: boolean;
  path?: string;
  priority?: 'low' | 'medium' | 'high';
  sameSite?: 'lax' | 'none' | 'strict' | boolean;
  secure?: boolean | 'auto';
}

export const AUTH_ACCESS_COOKIE = 'se_access_token';
export const AUTH_REFRESH_COOKIE = 'se_refresh_token';

const FORBIDDEN_COOKIE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

export function authCookieOptions(maxAgeSeconds?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
  };
}

/**
 * Hardened options for long-lived refresh cookies:
 *  - Scoped to `/v1/auth` so the refresh token is never transmitted on non-auth routes
 *  - `sameSite: 'strict'` in production (`'lax'` in dev) to block cross-site CSRF
 *  - `httpOnly: true`, `secure: true` in production, `priority: 'high'`
 */
export function refreshCookieOptions(maxAgeSeconds?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax',
    path: '/v1/auth',
    priority: 'high',
    maxAge: maxAgeSeconds,
  };
}

export function clearRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'strict' : 'lax',
    path: '/v1/auth',
  };
}

export function parseCookieHeader(cookieHeader?: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, segment) => {
    const index = segment.indexOf('=');
    if (index === -1) return acc;
    const key = segment.slice(0, index).trim();
    const value = segment.slice(index + 1).trim();
    if (!key || FORBIDDEN_COOKIE_KEYS.has(key)) return acc;
    try {
      acc[key] = decodeURIComponent(value);
    } catch {
      // A malformed percent-escape must not throw out of request handling.
      acc[key] = value;
    }
    return acc;
  }, {});
}
