/* eslint-disable no-console */
/**
 * Runs Drizzle migrations under a Postgres advisory lock so that when multiple
 * API replicas boot simultaneously, only one performs DDL while the others
 * wait, instead of racing each other in the migrate-on-boot flow.
 *
 * Uses drizzle-orm's in-process migrator (no shell/CLI dependency), so it is
 * portable across the Docker (alpine/sh) and Windows hosts.
 *
 * Usage: node scripts/migrate-locked.js
 */
const path = require('node:path');
const { Client } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

require('dotenv').config();

const ADVISORY_LOCK_KEY = 727_001_728_001;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[migrate-locked] DATABASE_URL is not set');
    process.exit(1);
  }

  const ssl = String(process.env.DB_SSL || 'false').toLowerCase() === 'true'
    ? { rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false' }
    : undefined;

  const client = new Client({ connectionString: url, ssl });
  await client.connect();

  const lockTimeoutMs = Number(process.env.MIGRATE_LOCK_TIMEOUT_MS || 300_000);
  let acquired = false;
  try {
    await client.query('SET lock_timeout = $1', [lockTimeoutMs]);
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    acquired = true;
    console.log('[migrate-locked] advisory lock acquired; running migrations');

    const db = drizzle({ client });
    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
    console.log('[migrate-locked] migrations applied');
  } catch (error) {
    console.error(`[migrate-locked] failed (${acquired ? 'during migration' : 'acquiring lock'}):`, error.message);
    process.exitCode = 1;
  } finally {
    if (acquired) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
      } catch (error) {
        console.error('[migrate-locked] unlock warning:', error.message);
      }
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error('[migrate-locked] fatal:', error);
  process.exit(1);
});