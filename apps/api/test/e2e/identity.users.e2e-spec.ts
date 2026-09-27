import { apiRequest, expectData, expectOk, adminToken } from './helpers';

describe('Identity Users module (e2e)', () => {
  it('GET /v1/profile returns the authenticated profile (DB query)', async () => {
    const token = await adminToken();
    const body = expectOk(await apiRequest('/profile', { token }));
    const data = body.data as { email?: string; first_name?: string };
    expect(data.email).toBeDefined();
  });

  it('GET /v1/users lists users for the tenant (permission-guarded, DB query)', async () => {
    const token = await adminToken();
    const body = expectOk(await apiRequest('/users', { token }));
    const data = body.data as { items?: unknown[]; rows?: unknown[] } | unknown[];
    if (Array.isArray(data)) {
      expect(data.length).toBeGreaterThanOrEqual(1);
    } else if (data && typeof data === 'object') {
      const list = (data as { items?: unknown[] }).items ?? (data as { rows?: unknown[] }).rows;
      expect(Array.isArray(list)).toBe(true);
      expect(list!.length).toBeGreaterThanOrEqual(1);
    } else {
      expect(data).toBeDefined();
    }
  });

  it('GET /v1/users/1 returns a single seeded user (DB query)', async () => {
    const token = await adminToken();
    const body = expectOk(await apiRequest('/users/1', { token }));
    const data = body.data as { id?: string | number; email?: string };
    expect(data.id ?? data.email).toBeDefined();
  });
});