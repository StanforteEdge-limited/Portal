export interface HealthCheck {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  database: 'up' | 'down';
  redis: 'up' | 'down';
  version: string;
  checks: Record<string, boolean>;
}
