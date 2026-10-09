import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '$app/db/relations';
import type { DbService } from '$core/db';

const MIGRATIONS_DIR = resolve(__dirname, '../../drizzle');

export type TestDb = DbService & { __databaseName: string };

/**
 * Integration tests run against a real Docker Postgres database with the
 * migrations applied, so SQL semantics - unique indexes, enums, `ilike`,
 * partial indexes - behave exactly as they do in production.
 */
async function applyMigrations(pool: Pool): Promise<void> {
  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folder of folders) {
    const file = join(MIGRATIONS_DIR, folder, 'migration.sql');
    let sql: string;
    try {
      sql = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    // Drizzle separates statements with a marker; the marker is not valid SQL.
    await pool.query(sql.replaceAll('--> statement-breakpoint', ';'));
  }
}

function databaseUrl(): URL {
  const rawUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL is required for integration tests');
  }
  return new URL(rawUrl);
}

function adminDatabaseUrl(url: URL): string {
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';
  return adminUrl.toString();
}

function testDatabaseUrl(url: URL, databaseName: string): string {
  const testUrl = new URL(url.toString());
  testUrl.pathname = `/${databaseName}`;
  return testUrl.toString();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function createTestDb(): Promise<TestDb> {
  const baseUrl = databaseUrl();
  const databaseName = `portal_test_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const adminPool = new Pool({ connectionString: adminDatabaseUrl(baseUrl) });

  try {
    await adminPool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } catch (error) {
    await adminPool.end().catch(() => {});
    throw new Error(
      `Unable to create PostgreSQL test database. Start Docker with "docker compose up -d postgres" and ensure DATABASE_URL points to it. ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await adminPool.end().catch(() => {});
  }

  const pool = new Pool({ connectionString: testDatabaseUrl(baseUrl, databaseName) });
  await applyMigrations(pool);
  const db = drizzle({ client: pool, relations }) as unknown as DbService['client'];

  return {
    client: db,
    pool,
    connect: async () => {
      await pool.query('SELECT 1');
    },
    close: async () => {
      await pool.end();
      const dropPool = new Pool({ connectionString: adminDatabaseUrl(baseUrl) });
      try {
        await dropPool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`);
      } finally {
        await dropPool.end();
      }
    },
    __databaseName: databaseName,
  } as unknown as TestDb;
}
