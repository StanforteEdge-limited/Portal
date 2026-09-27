import { apiRequest, expectOk } from './helpers';

describe('Platform Version module (e2e)', () => {
  it('GET /v1/version returns version parameters from the database', async () => {
    const { status, body } = await apiRequest('/version', {
      query: { platform: 'web', module: 'portal' },
    });
    expect(status).toBe(200);
    const env = expectOk({ status, body });
    expect(env.data).toBeDefined();
  });
});