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

