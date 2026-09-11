import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '$app/db/relations';

export type AppDb = NodePgDatabase<typeof relations>;

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
