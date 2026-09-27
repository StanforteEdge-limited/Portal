import { apiRequest, expectData, expectOk, login, adminToken, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

describe('Identity Auth module (e2e)', () => {
  it('POST /v1/auth/login authenticates with seeded credentials and returns the user', async () => {
    const { accessToken, body } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(accessToken).toBeTruthy();
    expect(body.success).toBe(true);
    const user = body.data?.user;
    expect(user).toBeDefined();
    expect(user?.email).toBe(ADMIN_EMAIL);
    expect(Array.isArray(user?.roles)).toBe(true);
    expect(Array.isArray(user?.permissions)).toBe(true);
  });

  it('POST /v1/auth/login rejects invalid credentials', async () => {
    const { status, body } = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'wrong-password' },
    });
    expect(status).toBe(401);
    expect((body as { success?: boolean }).success).toBe(false);
  });

  it('GET /v1/auth/status returns the signed-in profile (DB query)', async () => {
    const token = await adminToken();
    const body = expectOk(await apiRequest('/auth/status', { token }));
    const data = body.data as { id?: string; email?: string; roles?: string[] };
    expect(data.email).toBe(ADMIN_EMAIL);
    expect(data.id).toBeDefined();
  });

  it('GET /v1/auth/tenants lists the seeded tenant memberships (DB query)', async () => {
    const token = await adminToken();
    const data = expectData(await apiRequest('/auth/tenants', { token }));
    const tenants = data as Array<{ id: string; slug: string; isOwner: boolean }>;
    expect(tenants.length).toBeGreaterThanOrEqual(1);
    expect(tenants.some((t) => t.slug === 'stanforte-demo' && t.isOwner)).toBe(true);
  });

  it('rejects protected endpoints without a token', async () => {
    const { status } = await apiRequest('/auth/status');
    expect(status).toBe(401);
  });
});