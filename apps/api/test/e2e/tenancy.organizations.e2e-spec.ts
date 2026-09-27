import { apiRequest, expectData, expectOk, adminToken } from './helpers';

describe('Tenancy Organizations module (e2e)', () => {
  it('GET /v1/organizations/my returns the seeded organization (DB query)', async () => {
    const token = await adminToken();
    const body = expectOk(await apiRequest('/organizations/my', { token }));
    const data = body.data as { id?: string | number; name?: string };
    expect(data.id ?? data.name).toBeDefined();
  });

  it('GET /v1/organizations lists organizations for the permission-guarded route', async () => {
    const token = await adminToken();
    const body = expectOk(await apiRequest('/organizations', { token }));
    expect(body.data).toBeDefined();
  });

  it('GET /v1/organizations/:id returns the seeded organization (DB query)', async () => {
    const token = await adminToken();
    const mine = expectData(await apiRequest('/organizations/my', { token })) as { id?: string | number };
    const id = mine.id ?? '1';
    const body = expectOk(await apiRequest(`/organizations/${id}`, { token }));
    expect(body.data).toBeDefined();
  });
});