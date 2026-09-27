/**
 * Shared helpers for the HTTP-level end-to-end test suite.
 *
 * The suite talks to a LIVE instance of the API (started separately, e.g. via
 * docker compose or a local dev server) and performs real requests against the
 * same endpoints a browser/agent would use, so every test exercises:
 *   HTTP routing -> guards -> service layer -> database/redis.
 *
 * Configure the target with E2E_API_URL (defaults to the local dev API).
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@stanforteedge.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe123!';

export const API_BASE = (process.env.E2E_API_URL ?? 'http://localhost:3100/v1').replace(/\/+$/, '');

const TOKEN_FILE =
  process.env.E2E_TOKEN_FILE ?? join(tmpdir(), 'portal-api-e2e-admin-token.json');
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000; // access tokens expire after 15m

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: { status_code: number; message: string; code?: string; details?: string };
  path?: string;
  timestamp?: string;
}

export interface LoginResult {
  accessToken: string;
  body: ApiEnvelope<{ user?: Record<string, unknown> }>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  body: ApiEnvelope<T> | string;
}

let cachedAdminToken: string | null = null;

/** POST /auth/login with the seeded credentials and pull the access token out of the set-cookie. */
export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = (await res.json()) as ApiEnvelope<{ user?: Record<string, unknown> }>;
  if (!res.ok || body.success !== true) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(body)}`);
  }

  const setCookie = Array.isArray(res.headers.getSetCookie?.())
    ? res.headers.getSetCookie()
    : (res.headers as unknown as { ['set-cookie']?: string }).getSetCookie?.() ?? [];
  const accessCookie = (setCookie as string[]).find((c) => c.trim().startsWith('se_access_token='));
  const accessToken = accessCookie?.split(';')[0].split('=').slice(1).join('=') ?? '';
  if (!accessToken) {
    throw new Error(`Login succeeded but no access token cookie was returned: ${JSON.stringify(body)}`);
  }

  return { accessToken, body };
}

function toQueryString(query?: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Perform an HTTP request against the API and parse the response envelope. */
export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    ...opts.headers,
  };

  const res = await fetch(`${API_BASE}${path}${toQueryString(opts.query)}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return { status: res.status, body: parsed as ApiEnvelope<T> | string };
}

function tokenFileFresh(): string | null {
  try {
    const raw = readFileSync(TOKEN_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { accessToken?: string; createdAt?: number };
    if (parsed.accessToken && Date.now() - (parsed.createdAt ?? 0) < TOKEN_MAX_AGE_MS) {
      return parsed.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

function writeTokenFile(accessToken: string): void {
  try {
    writeFileSync(
      TOKEN_FILE,
      JSON.stringify({ accessToken, createdAt: Date.now() }),
      'utf8',
    );
  } catch {
    /* best-effort caching only */
  }
}

function markTokenStale(): void {
  try {
    const path = TOKEN_FILE;
    const fresh = statSync(path);
    writeFileSync(path, JSON.stringify({ createdAt: fresh.mtimeMs - TOKEN_MAX_AGE_MS }), 'utf8');
  } catch {
    /* ignore */
  }
}

/**
 * Returns a valid admin access token for the module test files. Reuses the
 * on-disk cache (written by the first login of any test run) so the whole
 * suite performs only a handful of real logins and respects auth rate limits.
 */
export async function adminToken(): Promise<string> {
  if (cachedAdminToken) return cachedAdminToken;

  const cached = tokenFileFresh();
  if (cached) {
    cachedAdminToken = cached;
    return cached;
  }

  const { accessToken } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  cachedAdminToken = accessToken;
  writeTokenFile(accessToken);
  return accessToken;
}

export function expectOk<T>(response: ApiResponse<T>): ApiEnvelope<T> {
  expect(response.status).toBe(200);
  expect(typeof response.body).toBe('object');
  const body = response.body as ApiEnvelope<T>;
  expect(body.success).toBe(true);
  return body;
}

export function expectData<T>(response: ApiResponse<T>): T {
  const body = expectOk(response);
  expect(body.data).toBeDefined();
  return body.data as T;
}

/** Run the provided callback, retrying on transient 401s (token rotation). */
export async function withFreshTokenOnUnauthorized<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = await adminToken();
  try {
    return await fn(token);
  } catch (error) {
    const response = (error as { response?: ApiResponse })?.response;
    if (response && (response.status === 401 || (response.body as ApiEnvelope)?.success === false)) {
      cachedAdminToken = null;
      markTokenStale();
      const fresh = await adminToken();
      return fn(fresh);
    }
    throw error;
  }
}