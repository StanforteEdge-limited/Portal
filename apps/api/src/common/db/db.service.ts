import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '$app/db/relations';

export type AppDb = NodePgDatabase<typeof relations>;

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);

  private static sslConfig(): object | undefined {
    const sslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';
    if (!sslEnabled) return undefined;
    const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';
    return { rejectUnauthorized };
  }

  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX || 20),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    application_name: process.env.DB_APPLICATION_NAME || 'portal-api',
    ...(process.env.DB_STATEMENT_TIMEOUT_MS ? { statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) } : {}),
    ...(process.env.DB_QUERY_TIMEOUT_MS ? { query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS) } : {}),
    ...(DbService.sslConfig() ? { ssl: DbService.sslConfig() } : {}),
  });

  readonly client: AppDb = drizzle({ client: this.pool, relations });

  async onModuleInit() {
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

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database disconnected');
  }
}
