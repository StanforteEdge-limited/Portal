/**
 * Isolated test environment: deterministic JWT secrets and no shared Redis/DB
 * fallbacks. Set before any spec imports `src/config`.
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';
process.env.AUTH_ROLE_CACHE_TTL_MS = '1000';
process.env.APP_BASE_URL = 'http://localhost:3000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://stanforte:stanforte-dev@localhost:5455/stanforte';

// Cache and queues degrade gracefully without Redis; tests never reach them.
delete process.env.REDIS_URL;
delete process.env.REDIS_HOST;
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.MAIL_FROM;
