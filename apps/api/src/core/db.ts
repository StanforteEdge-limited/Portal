import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  sum,
} from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '$app/db/relations';
import * as schema from '$app/db/schema';
import { Logger } from '$core/logger';

export type AppDb = NodePgDatabase<typeof relations>;

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

  constructor() {
    this.installQueryCompat();
  }

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

  private installQueryCompat() {
    const client = this.client as any;
    if (!client.query) return;

    for (const [name, table] of Object.entries(schema)) {
      const query = client.query[name];
      if (!query || !table || typeof table !== 'object') continue;

      query.findMany = async (args: any = {}) => {
        const shape = this.selectShape(table, args.select);
        let statement = (shape ? client.select(shape) : client.select())
          .from(table as any)
          .where(this.toWhere(table, args.where))
          .orderBy(...this.toOrder(table, args.orderBy));
        if (typeof args.skip === 'number') statement = statement.offset(args.skip);
        if (typeof args.take === 'number') statement = statement.limit(args.take);
        return statement;
      };

      query.findFirst = async (args: any = {}) => {
        const shape = this.selectShape(table, args.select);
        const rows = await (shape ? client.select(shape) : client.select())
          .from(table as any)
          .where(this.toWhere(table, args.where))
          .orderBy(...this.toOrder(table, args.orderBy))
          .limit(1);
        return rows[0] ?? null;
      };

      query.findUnique ??= async (args: any = {}) => {
        const shape = this.selectShape(table, args.select);
        const rows = await (shape ? client.select(shape) : client.select())
          .from(table as any)
          .where(this.toWhere(table, args.where))
          .limit(1);
        return rows[0] ?? null;
      };

      query.findManyOrThrow = async (args: any = {}) => {
        const rows = await query.findMany(args);
        if (!rows.length) throw new Error(`No ${name} found matching the given filters.`);
        return rows;
      };

      query.findFirstOrThrow = async (args: any = {}) => {
        const row = await query.findFirst(args);
        if (!row) throw new Error(`No ${name} found matching the given filters.`);
        return row;
      };

      query.findUniqueOrThrow = async (args: any = {}) => {
        const row = await query.findUnique(args);
        if (!row) throw new Error(`No ${name} found matching the given filters.`);
        return row;
      };

      query.count ??= async (args: any = {}) => {
        const rows = await client.select({ value: count() }).from(table as any).where(this.toWhere(table, args.where));
        return Number(rows[0]?.value ?? 0);
      };

      query.aggregate ??= async (args: any = {}) => {
        const select: Record<string, any> = {};
        if (args._sum) {
          select._sum = sql<Record<string, string | null>>`jsonb_build_object(${sql.join(
            Object.keys(args._sum).flatMap((key) => [sql.raw(`'${key}'`), sum((table as any)[key])]),
            sql`, `
          )})`;
        }
        if (args._avg) {
          select._avg = sql<Record<string, string | null>>`jsonb_build_object(${sql.join(
            Object.keys(args._avg).flatMap((key) => [sql.raw(`'${key}'`), avg((table as any)[key])]),
            sql`, `
          )})`;
        }
        const rows = await client.select(select).from(table as any).where(this.toWhere(table, args.where));
        return { _sum: rows[0]?._sum ?? {}, _avg: rows[0]?._avg ?? {} };
      };

      query.groupBy ??= async (args: any = {}) => {
        const by = Array.isArray(args.by) ? args.by : [];
        const select: Record<string, any> = Object.fromEntries(by.map((key) => [key, (table as any)[key]]));
        if (args._sum) {
          for (const key of Object.keys(args._sum)) select[`_sum_${key}`] = sum((table as any)[key]);
        }
        if (args._count) select._count = count();
        const rows = await client
          .select(select)
          .from(table as any)
          .where(this.toWhere(table, args.where))
          .groupBy(...by.map((key) => (table as any)[key]))
          .orderBy(...this.toOrder(table, args.orderBy));
        return rows.map((row: any) => ({
          ...Object.fromEntries(by.map((key) => [key, row[key]])),
          _sum: Object.fromEntries(Object.keys(args._sum ?? {}).map((key) => [key, row[`_sum_${key}`]])),
          _count: args._count ? { _all: Number(row._count ?? 0) } : undefined
        }));
      };

      query.create ??= async (args: any = {}) => {
        const rows = await client.insert(table as any).values(this.cleanWriteData(args.data ?? {})).returning();
        return rows[0] ?? null;
      };

      query.createMany ??= async (args: any = {}) => {
        const data = Array.isArray(args.data) ? args.data : args.data ? [args.data] : [];
        if (!data.length) return { count: 0 };
        const rows = await client
          .insert(table as any)
          .values(data.map((entry: Record<string, any>) => this.cleanWriteData(entry)))
          .returning();
        return { count: rows.length };
      };

      query.update ??= async (args: any = {}) => {
        const rows = await client
          .update(table as any)
          .set(this.cleanWriteData(args.data ?? {}))
          .where(this.toWhere(table, args.where))
          .returning();
        return rows[0] ?? null;
      };

      query.updateMany ??= async (args: any = {}) => {
        const rows = await client
          .update(table as any)
          .set(this.cleanWriteData(args.data ?? {}))
          .where(this.toWhere(table, args.where))
          .returning();
        return { count: rows.length };
      };

      query.delete ??= async (args: any = {}) => {
        const rows = await client.delete(table as any).where(this.toWhere(table, args.where)).returning();
        return rows[0] ?? null;
      };

      query.deleteMany ??= async (args: any = {}) => {
        const rows = await client.delete(table as any).where(this.toWhere(table, args.where)).returning();
        return { count: rows.length };
      };

      query.upsert ??= async (args: any = {}) => {
        const existing = await query.findFirst({ where: args.where });
        if (existing) return query.update({ where: args.where, data: args.update ?? {} });
        return query.create({ data: args.create ?? {} });
      };
    }
  }

  private selectShape(table: any, select?: Record<string, boolean>) {
    if (!select) return undefined;
    return Object.fromEntries(Object.entries(select).filter(([, enabled]) => enabled).map(([key]) => [key, table[key]]));
  }

  private toWhere(table: any, where?: Record<string, any>): any {
    if (!where) return undefined;
    const clauses = this.toClauses(table, where);
    return clauses.length ? and(...clauses) : undefined;
  }

  private toClauses(table: any, where: Record<string, any>): any[] {
    const clauses: any[] = [];
    for (const [key, value] of Object.entries(where)) {
      if (key === 'OR' && Array.isArray(value)) {
        const nested = value.map((item) => this.toWhere(table, item)).filter(Boolean);
        if (nested.length) clauses.push(or(...nested));
        continue;
      }
      if (key === 'AND' && Array.isArray(value)) {
        const nested = value.map((item) => this.toWhere(table, item)).filter(Boolean);
        if (nested.length) clauses.push(and(...nested));
        continue;
      }
      const column = table[key];
      if (!column) continue;
      const clause = this.toColumnClause(column, value);
      if (clause) clauses.push(clause);
    }
    return clauses;
  }

  private toColumnClause(column: any, value: any): any {
    if (value === null) return isNull(column);
    if (Array.isArray(value)) return inArray(column, value);
    if (!value || typeof value !== 'object' || value instanceof Date) return eq(column, value);
    const parts: any[] = [];
    if ('in' in value) parts.push(inArray(column, value.in));
    if ('equals' in value) parts.push(value.equals === null ? isNull(column) : eq(column, value.equals));
    if ('not' in value) parts.push(value.not === null ? isNotNull(column) : ne(column, value.not));
    if ('contains' in value) parts.push(ilike(column, `%${String(value.contains)}%`));
    if ('string_contains' in value) parts.push(ilike(column, `%${String(value.string_contains)}%`));
    if ('gte' in value) parts.push(gte(column, value.gte));
    if ('lte' in value) parts.push(lte(column, value.lte));
    if ('gt' in value) parts.push(gt(column, value.gt));
    if ('lt' in value) parts.push(lt(column, value.lt));
    return parts.length ? and(...parts) : undefined;
  }

  private toOrder(table: any, orderBy?: any): any[] {
    const items = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
    return items.flatMap((item) =>
      Object.entries(item)
        .map(([key, direction]) => {
          const column = table[key];
          if (!column) return null;
          return String(direction).toLowerCase() === 'desc' ? desc(column) : asc(column);
        })
        .filter(Boolean)
    );
  }

  private cleanWriteData(data: Record<string, any>) {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  }
}
