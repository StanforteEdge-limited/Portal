import { apiRequest } from './helpers';

describe('Platform Health module (e2e)', () => {
  it('GET /v1/health returns liveness', async () => {
    const { status, body } = await apiRequest('/health');
    expect(status).toBe(200);
    const env = body as { success: boolean; data?: { status?: string } };
    if (typeof body === 'object' && body !== null && 'success' in (body as object)) {
      expect(env.success).toBe(true);
      expect(env.data?.status).toBe('ok');
    } else {
      expect((body as { status?: string }).status).toBe('ok');
    }
  });

  it('GET /v1/health/ready verifies the database and redis are queryable', async () => {
    const { status, body } = await apiRequest('/health/ready');
    // readiness reports non-200 when a dependency is down, so the health check
    // itself is exercised regardless; but with the seeded services it is 200.
    expect([200, 503]).toContain(status);
    const report = body as { status?: string; checks?: { database?: { status?: string }; redis?: { status?: string }; storage?: { driver?: string } } };
    expect(report.status).toBe('ok');
    expect(report.checks?.database?.status).toBe('up');
    expect(report.checks?.redis?.status).toBe('up');
    expect(report.checks?.storage?.driver).toBeDefined();
  });
});