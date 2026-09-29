import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '$app/db/relations';
import { Logger } from '$core/logger';

export type AppDb = Omit<NodePgDatabase<typeof relations>, "query" | "transaction"> & {
  query: any;
  transaction: <T>(
    callback: (tx: any) => T | Promise<T>,
  ) => Promise<T>;
  [key: string]: any;
};

export class DbService {
  private readonly logger = new Logger(DbService.name);

  private static sslConfig(): object | undefined {
    const sslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';
    if (!sslEnabled) return undefined;
    const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';
    return { rejectUnauthorized };
  }

  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX || 20),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    application_name: process.env.DB_APPLICATION_NAME || 'portal-api-fastify',
    ...(process.env.DB_STATEMENT_TIMEOUT_MS ? { statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) } : {}),
    ...(process.env.DB_QUERY_TIMEOUT_MS ? { query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS) } : {}),
    ...(DbService.sslConfig() ? { ssl: DbService.sslConfig() } : {}),
  });

  readonly client: AppDb = drizzle({ client: this.pool, relations });

  async connect() {
    try {
      await this.pool.query('SELECT 1');
      this.logger.log('Database connected');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw new Error(
        `Drizzle failed to connect during startup: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async close() {
    await this.pool.end();
    this.logger.log('Database disconnected');
  }
}
