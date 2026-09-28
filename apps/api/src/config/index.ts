import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/api-fastify/.env'),
  resolve(process.cwd(), 'apps/api/.env'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env'),
];

for (const file of envCandidates) {
  if (existsSync(file)) {
    loadEnv({ path: file, override: false });
  }
}

function str(name: string, fallback = ''): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function num(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

function list(name: string): string[] {
  return str(name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Fastify's `trustProxy` accepts a boolean, an IP/subnet list, or a function.
 * It does NOT accept the `'true'`/`'false'`/`'1'`/`'0'` strings the env var uses
 * for Express, and it has no numeric hop count, so the raw string has to be
 * translated or the server either refuses to boot (`invalid IP address: true`)
 * or silently stops trusting the proxy hop, which collapses `request.ip` to the
 * nginx address.
 *
 * Mirrors the Express branches in `main.ts`. A single reverse proxy sits in
 * front of the API, so hop count 1 and trust-all resolve identically and `true`
 * is used.
 */
function trustProxySetting(): boolean | string {
  const raw = str('TRUST_PROXY', str('NODE_ENV', 'development').toLowerCase() === 'production' ? '1' : '0');
  if (raw === 'false' || raw === '0') return false;
  if (raw === 'true' || raw === '1') return true;
  return raw;
}

const LOCAL_DEV_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export const config = {
  env: str('NODE_ENV', 'development'),
  isProduction: str('NODE_ENV', 'development').toLowerCase() === 'production',
  port: num('PORT', 3000),
  host: str('HOST', '0.0.0.0'),
  logLevel: str('LOG_LEVEL', 'info'),
  trustProxy: trustProxySetting(),
  uploadsRoot: resolve(process.cwd(), 'uploads'),
  corsOrigins: Array.from(new Set([...list('CORS_ORIGINS'), ...LOCAL_DEV_CORS_ORIGINS])),
  realtimeEnabled: bool('REALTIME_ENABLED', true),
  jwt: {
    secret: str('JWT_SECRET', 'change-me'),
    refreshSecret: str('JWT_REFRESH_SECRET', 'change-me-too'),
    expiresIn: str('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: str('JWT_REFRESH_EXPIRES_IN', '30d'),
    roleCacheTtlMs: num('AUTH_ROLE_CACHE_TTL_MS', 30_000),
  },
  rateLimit: {
    global: {
      windowMs: num('GLOBAL_RATE_LIMIT_WINDOW_MS', 60_000),
      max: num('GLOBAL_RATE_LIMIT_MAX', 600),
    },
    auth: {
      windowMs: num('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      loginMax: num('AUTH_LOGIN_RATE_LIMIT_MAX', 10),
      forgotMax: num('AUTH_FORGOT_RATE_LIMIT_MAX', 5),
      inviteMax: num('AUTH_INVITE_ACCEPT_RATE_LIMIT_MAX', 10),
    },
  },
} as const;

export function assertProductionSecrets(): void {
  if (!config.isProduction) return;
  const { secret, refreshSecret } = config.jwt;
  if (!secret || !refreshSecret || secret === 'change-me' || refreshSecret === 'change-me-too') {
    throw new Error('JWT secrets must be set to non-default values in production');
  }
}
