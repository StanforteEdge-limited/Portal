import { API_BASE } from './helpers';

type OpenApiDocument = {
  paths: Record<string, Record<string, unknown>>;
};

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const API_ORIGIN = new URL(API_BASE).origin;

function samplePath(path: string) {
  return path.replace(/\{([^}]+)\}/g, (_match, rawName: string) => {
    const name = String(rawName).toLowerCase();
    if (name.includes('date')) return '2026-09-21';
    if (name.includes('key')) return 'general';
    if (name.includes('type')) return 'request';
    if (name.includes('uid')) return '1';
    return '1';
  });
}

function requestInit(method: string): RequestInit {
  const upper = method.toUpperCase();
  const canHaveBody = !['GET', 'HEAD', 'DELETE'].includes(upper);
  return {
    method: upper,
    redirect: 'manual',
    headers: {
      accept: 'application/json',
      ...(canHaveBody ? { 'content-type': 'application/json' } : {}),
    },
    body: canHaveBody ? JSON.stringify({}) : undefined,
  };
}

async function responseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function isRouterMiss(method: string, path: string, status: number, text: string) {
  if (status !== 404) return false;
  const upper = method.toUpperCase();
  return text.includes(`Cannot ${upper} ${path}`) || text.includes(`Cannot ${upper}`);
}

describe('all documented backend endpoints (e2e smoke)', () => {
  let endpoints: Array<{ method: string; path: string; sampledPath: string }> = [];

  beforeAll(async () => {
    const response = await fetch(`${API_ORIGIN}/docs-json`, { redirect: 'manual' });
    expect(response.status).toBe(200);
    const document = (await response.json()) as OpenApiDocument;

    endpoints = Object.entries(document.paths)
      .flatMap(([path, operations]) =>
        Object.keys(operations)
          .filter((method) => HTTP_METHODS.has(method))
          .map((method) => ({ method, path, sampledPath: samplePath(path) })),
      )
      .sort((a, b) => `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`));

    expect(endpoints.length).toBeGreaterThan(0);
  });

  it('loads a broad OpenAPI route inventory', () => {
    expect(endpoints.length).toBeGreaterThan(250);
    expect(endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'post', path: '/v1/auth/login' }),
        expect.objectContaining({ method: 'get', path: '/v1/tenancy/current' }),
        expect.objectContaining({ method: 'get', path: '/v1/users' }),
        expect.objectContaining({ method: 'get', path: '/v1/finance/summary' }),
        expect.objectContaining({ method: 'post', path: '/v1/procurement/requisitions' }),
      ]),
    );
  });

  it('can invoke every documented route without falling through to the router 404', async () => {
    const misses: string[] = [];

    for (const { method, path, sampledPath } of endpoints) {
      const response = await fetch(`${API_ORIGIN}${sampledPath}`, requestInit(method));
      const text = await responseText(response);

      if (isRouterMiss(method, sampledPath, response.status, text)) {
        misses.push(`${method.toUpperCase()} ${path} sampled as ${sampledPath}`);
      }
    }

    expect(misses).toEqual([]);
  });
});
