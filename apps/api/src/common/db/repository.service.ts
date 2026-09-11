import { Injectable } from '@nestjs/common';
import {
  SQL,
  and,
  asc,
  count as drizzleCount,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { NodePgTransaction } from 'drizzle-orm/node-postgres';
import * as schema from '$app/db/schema';
import { AppDb, DbService } from './db.service';
import { relations } from '$app/db/relations';
import { TenantContextService } from '$common/auth/tenant-context.service';

type DbLike = AppDb | NodePgTransaction<typeof relations>;
type QueryArgs = Record<string, any> | undefined;

const tableMap = schema as Record<string, any>;

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function compact<T>(values: Array<T | undefined>) {
  return values.filter((value): value is T => value !== undefined);
}

function tableColumns(table: any) {
  return getTableColumns(table) as Record<string, any>;
}

function singularize(value: string) {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.endsWith('ses')) return value.slice(0, -2);
  if (value.endsWith('s')) return value.slice(0, -1);
  return value;
}

function relationNames(value: string) {
  const normalized = lowerFirst(value);
  const singular = singularize(normalized);
  return new Set([normalized, singular, `${normalized}s`, `${singular}s`]);
}

function normalizeCompoundWhere(where: Record<string, any>, columns: Record<string, any>) {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(where)) {
    if (columns[key] || ['AND', 'OR', 'NOT'].includes(key)) {
      normalized[key] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(normalized, value);
    }
  }
  return normalized;
}

function buildFieldCondition(column: any, value: any): SQL | undefined {
  if (value === undefined) return undefined;
  if (value === null) return isNull(column);
  if (value instanceof Date) return eq(column, value);
  if (typeof value !== 'object' || Array.isArray(value)) return eq(column, value);

  const conditions: SQL[] = [];
  for (const [operator, operand] of Object.entries(value)) {
    if (operand === undefined || operator === 'mode') continue;
    const insensitive = value.mode === 'insensitive';
    if (operator === 'equals') conditions.push(operand === null ? isNull(column) : eq(column, operand));
    if (operator === 'not') {
      if (operand === null) conditions.push(isNotNull(column));
      else conditions.push(not(buildFieldCondition(column, operand) ?? eq(column, operand)));
    }
    if (operator === 'in' && Array.isArray(operand)) conditions.push(inArray(column, operand));
    if (operator === 'notIn' && Array.isArray(operand)) conditions.push(notInArray(column, operand));
    if (operator === 'lt') conditions.push(lt(column, operand));
    if (operator === 'lte') conditions.push(lte(column, operand));
    if (operator === 'gt') conditions.push(gt(column, operand));
    if (operator === 'gte') conditions.push(gte(column, operand));
    if (operator === 'contains') conditions.push((insensitive ? ilike : like)(column, `%${operand}%`));
    if (operator === 'startsWith') conditions.push((insensitive ? ilike : like)(column, `${operand}%`));
    if (operator === 'endsWith') conditions.push((insensitive ? ilike : like)(column, `%${operand}`));
  }
  return conditions.length === 0 ? undefined : and(...conditions);
}

function buildWhere(table: any, where?: Record<string, any>): SQL | undefined {
  if (!where || Object.keys(where).length === 0) return undefined;
  const columns = tableColumns(table);
  const normalized = normalizeCompoundWhere(where, columns);
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(normalized)) {
    if (key === 'AND') {
      const items = Array.isArray(value) ? value : [value];
      const nested = compact(items.map((entry) => buildWhere(table, entry)));
      if (nested.length) conditions.push(and(...nested) as SQL);
      continue;
    }
    if (key === 'OR') {
      const items = Array.isArray(value) ? value : [value];
      const nested = compact(items.map((entry) => buildWhere(table, entry)));
      if (nested.length) conditions.push(or(...nested) as SQL);
      continue;
    }
    if (key === 'NOT') {
      const nested = buildWhere(table, value);
      if (nested) conditions.push(not(nested));
      continue;
    }
    if (!columns[key]) continue;
    const condition = buildFieldCondition(columns[key], value);
    if (condition) conditions.push(condition);
  }

  return conditions.length === 0 ? undefined : and(...conditions);
}

function buildColumns(table: any, select?: Record<string, boolean>) {
  if (!select) return undefined;
  const columns = tableColumns(table);
  const selected: Record<string, any> = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled && columns[key]) selected[key] = columns[key];
  }
  return Object.keys(selected).length ? selected : undefined;
}

function buildOrderBy(table: any, orderBy?: any) {
  if (!orderBy) return undefined;
  const columns = tableColumns(table);
  const items = Array.isArray(orderBy) ? orderBy : [orderBy];
  return compact(
    items.flatMap((entry) =>
      Object.entries(entry ?? {}).map(([key, direction]) => {
        if (!columns[key]) return undefined;
        return direction === 'desc' ? desc(columns[key]) : asc(columns[key]);
      }),
    ),
  );
}

function cleanData(data: Record<string, any>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function tenantScopedWhere(table: any, where: Record<string, any> | undefined, tenantId?: bigint) {
  if (!tenantId || !tableColumns(table).tenantId) return where;
  return { AND: [{ tenantId }, ...(where ? [where] : [])] };
}

function tenantScopedData(table: any, data: Record<string, any>, tenantId?: bigint) {
  if (!tenantId || !tableColumns(table).tenantId || data.tenantId !== undefined) return data;
  return { ...data, tenantId };
}

function valuesForRaw(strings: TemplateStringsArray, values: unknown[]) {
  return strings.reduce((query, chunk, index) => sql`${query}${sql.raw(chunk)}${index < values.length ? values[index] : sql.raw('')}`, sql``);
}

class TableRepository {
  constructor(
    protected readonly db: DbLike,
    protected readonly tableName: string,
    protected readonly table: any,
    protected readonly tenantContext?: TenantContextService,
  ) {}

  async findMany(args: QueryArgs = {}): Promise<any[]> {
    let query = this.db.select(buildColumns(this.table, args?.select)).from(this.table).$dynamic();
    const where = buildWhere(this.table, tenantScopedWhere(this.table, args?.where, this.tenantContext?.get()?.tenantId));
    const orderBy = buildOrderBy(this.table, args?.orderBy);
    if (where) query = query.where(where);
    if (orderBy?.length) query = query.orderBy(...orderBy);
    if (args?.skip != null) query = query.offset(Number(args.skip));
    if (args?.take != null) query = query.limit(Math.abs(Number(args.take)));
    const rows = await query;
    return this.attachIncludes(rows, args?.include);
  }

  async findFirst(args: QueryArgs = {}): Promise<any> {
    const rows = await this.findMany({ ...args, take: 1 });
    return rows[0] ?? null;
  }

  async findUnique(args: QueryArgs = {}): Promise<any> {
    return this.findFirst(args);
  }

  async findUniqueOrThrow(args: QueryArgs = {}): Promise<any> {
    const row = await this.findUnique(args);
    if (!row) throw new Error(`No ${this.tableName} record matched the query`);
    return row;
  }

  async count(args: QueryArgs = {}): Promise<number> {
    let query = this.db.select({ value: drizzleCount() }).from(this.table).$dynamic();
    const where = buildWhere(this.table, tenantScopedWhere(this.table, args?.where, this.tenantContext?.get()?.tenantId));
    if (where) query = query.where(where);
    const rows = await query;
    return Number(rows[0]?.value ?? 0);
  }

  async create(args: QueryArgs = {}): Promise<any> {
    const rows = await this.db.insert(this.table).values(
      cleanData(tenantScopedData(this.table, args?.data ?? {}, this.tenantContext?.get()?.tenantId)),
    ).returning();
    const result = rows[0] ?? null;
    return this.attachInclude(result, args?.include);
  }

  async createMany(args: QueryArgs = {}): Promise<{ count: number }> {
    const data = Array.isArray(args?.data) ? args.data : [args?.data].filter(Boolean);
    if (data.length === 0) return { count: 0 };
    await this.db.insert(this.table).values(
      data.map((entry: Record<string, any>) =>
        cleanData(tenantScopedData(this.table, entry, this.tenantContext?.get()?.tenantId)),
      ),
    );
    return { count: data.length };
  }

  async update(args: QueryArgs = {}): Promise<any> {
    let query = this.db.update(this.table).set(cleanData(args?.data ?? {})).returning().$dynamic();
    const where = buildWhere(this.table, tenantScopedWhere(this.table, args?.where, this.tenantContext?.get()?.tenantId));
    if (where) query = query.where(where);
    const rows = await query;
    return this.attachInclude(rows[0] ?? null, args?.include);
  }

  async updateMany(args: QueryArgs = {}): Promise<{ count: number }> {
    let query = this.db.update(this.table).set(cleanData(args?.data ?? {})).$dynamic();
    const where = buildWhere(this.table, tenantScopedWhere(this.table, args?.where, this.tenantContext?.get()?.tenantId));
    if (where) query = query.where(where);
    const result = await query;
    return { count: Number(result?.rowCount ?? 0) };
  }

  async delete(args: QueryArgs = {}): Promise<any> {
    let query = this.db.delete(this.table).returning().$dynamic();
    const where = buildWhere(this.table, tenantScopedWhere(this.table, args?.where, this.tenantContext?.get()?.tenantId));
    if (where) query = query.where(where);
    const rows = await query;
    return rows[0] ?? null;
  }

  async deleteMany(args: QueryArgs = {}): Promise<{ count: number }> {
    let query = this.db.delete(this.table).$dynamic();
    const where = buildWhere(this.table, tenantScopedWhere(this.table, args?.where, this.tenantContext?.get()?.tenantId));
    if (where) query = query.where(where);
    const result = await query;
    return { count: Number(result?.rowCount ?? 0) };
  }

  async upsert(args: QueryArgs = {}): Promise<any> {
    const existing = await this.findUnique({ where: args?.where });
    if (existing) return this.update({ where: args?.where, data: args?.update, include: args?.include });
    return this.create({ data: args?.create, include: args?.include });
  }

  async aggregate(args: QueryArgs = {}): Promise<any> {
    const total = await this.count({ where: args?.where });
    return { _count: { _all: total } };
  }

  async groupBy(args: QueryArgs = {}): Promise<any[]> {
    const by = Array.isArray(args?.by) ? args.by : [args?.by].filter(Boolean);
    const columns = tableColumns(this.table);
    const selection: Record<string, any> = {};
    for (const key of by) {
      if (columns[key]) selection[key] = columns[key];
    }
    if (args?._sum) {
      for (const key of Object.keys(args._sum)) {
        if (columns[key]) selection[`_sum_${key}`] = sql`sum(${columns[key]})`;
      }
    }
    if (args?._count) selection._count = drizzleCount();
    let query = this.db.select(selection).from(this.table).$dynamic();
    const where = buildWhere(this.table, tenantScopedWhere(this.table, args?.where, this.tenantContext?.get()?.tenantId));
    if (where) query = query.where(where);
    if (by.length) query = query.groupBy(...compact(by.map((key) => columns[key])));
    const rows = await query;
    return rows.map((row: any) => {
      const mapped = { ...row };
      if (args?._sum) {
        mapped._sum = {};
        for (const key of Object.keys(args._sum)) mapped._sum[key] = row[`_sum_${key}`] ?? null;
      }
      if (args?._count) mapped._count = row._count ?? 0;
      return mapped;
    });
  }

  private async attachIncludes<T>(rows: T[], include?: Record<string, any>): Promise<T[]> {
    if (!include) return rows;
    return Promise.all(rows.map((row) => this.attachInclude(row, include)));
  }

  private async attachInclude<T>(row: T, include?: Record<string, any>): Promise<T> {
    if (!row || !include) return row;
    const result = { ...(row as any) };
    for (const [relationName, relationArgs] of Object.entries(include)) {
      if (relationName === '_count') {
        result._count = await this.loadRelationCounts(result, relationArgs as any);
        continue;
      }
      const relation = this.resolveRelation(relationName, result);
      if (!relation) continue;
      const args = relationArgs === true ? {} : (relationArgs ?? {});
      const relatedRows = await relation.repository.findMany({
        where: { [relation.foreignKey]: relation.foreignValue(result) },
        select: args.select,
        include: args.include,
        orderBy: args.orderBy,
        skip: args.skip,
        take: args.take,
      });
      result[relationName] = relation.many ? relatedRows : relatedRows[0] ?? null;
    }
    return result;
  }

  private resolveRelation(relationName: string, row: Record<string, any>) {
    const names = relationNames(relationName);
    const sourceColumns = tableColumns(this.table);
    const sourceId = row.id;
    if (sourceId === undefined) return undefined;

    for (const candidateName of names) {
      const target = tableMap[candidateName];
      if (!target || target === this.table) continue;
      const targetColumns = tableColumns(target);
      const directKey = [...names].map((name) => `${name}Id`).find((key) => sourceColumns[key]);
      if (directKey) {
        return {
          repository: new TableRepository(this.db, candidateName, target, this.tenantContext),
          foreignKey: 'id',
          foreignValue: (value: Record<string, any>) => value[directKey],
          many: false,
        };
      }
      const reverseKey = [`${lowerFirst(this.tableName)}Id`, `${singularize(lowerFirst(this.tableName))}Id`]
        .find((key) => targetColumns[key]);
      if (reverseKey) {
        return {
          repository: new TableRepository(this.db, candidateName, target, this.tenantContext),
          foreignKey: reverseKey,
          foreignValue: () => sourceId,
          many: true,
        };
      }
    }

    return this.resolveJoinRelation(relationName, row, names, sourceId);
  }

  private resolveJoinRelation(
    relationName: string,
    row: Record<string, any>,
    names: Set<string>,
    sourceId: any,
  ) {
    const sourceKeyNames = relationNames(this.tableName);
    const sourceForeignKeys = [...sourceKeyNames].map((name) => `${name}Id`);
    const targetName = [...names]
      .map((name) => tableMap[name] ? name : undefined)
      .find(Boolean);
    if (!targetName) return undefined;
    const target = tableMap[targetName];
    const targetColumns = tableColumns(target);

    for (const [joinName, joinTable] of Object.entries(tableMap)) {
      if (joinTable === this.table || joinTable === target) continue;
      const joinColumns = tableColumns(joinTable);
      const sourceForeignKey = sourceForeignKeys.find((key) => joinColumns[key]);
      const targetForeignKey = [...relationNames(targetName)].map((name) => `${name}Id`).find((key) => joinColumns[key]);
      if (!sourceForeignKey || !targetForeignKey) continue;
      return {
        repository: new JoinTableRepository(
          this.db,
          joinTable,
          target,
          sourceForeignKey,
          targetForeignKey,
          sourceId,
          this.tenantContext,
        ),
        foreignKey: 'id',
        foreignValue: (value: Record<string, any>) => value.id,
        many: true,
      };
    }
    return undefined;
  }

  private async loadRelationCounts(row: Record<string, any>, args: any) {
    const select = args?.select ?? {};
    const counts: Record<string, number> = {};
    for (const [relationName, enabled] of Object.entries(select)) {
      if (!enabled) continue;
      const relation = this.resolveRelation(relationName, row);
      if (!relation) continue;
      const rows = await relation.repository.findMany({
        where: { [relation.foreignKey]: relation.foreignValue(row) },
      });
      counts[relationName] = rows.length;
    }
    return counts;
  }
}

class JoinTableRepository extends TableRepository {
  constructor(
    db: DbLike,
    private readonly joinTable: any,
    target: any,
    private readonly sourceForeignKey: string,
    private readonly targetForeignKey: string,
    private readonly sourceId: any,
    tenantContext?: TenantContextService,
  ) {
    super(db, 'join', target, tenantContext);
  }

  async findMany(args: QueryArgs = {}): Promise<any[]> {
    const joins = await this.db.select().from(this.joinTable).where(eq(tableColumns(this.joinTable)[this.sourceForeignKey], this.sourceId));
    const ids = joins.map((join: any) => join[this.targetForeignKey]).filter((id: any) => id !== undefined);
    if (!ids.length) return [];
    return super.findMany({
      ...args,
      where: { AND: [{ id: { in: ids } }, ...(args.where ? [args.where] : [])] },
    });
  }
}

@Injectable()
export class RepositoryService {
  private readonly delegates = new Map<string, TableRepository>();

  constructor(private readonly dbService: DbService, private readonly tenantContext?: TenantContextService) {
    return new Proxy(this, {
      get: (target, property, receiver) => {
        if (typeof property !== 'string') return Reflect.get(target, property, receiver);
        if (property in target) return Reflect.get(target, property, receiver);
        const table = tableMap[property] ?? tableMap[lowerFirst(property)];
        if (!table) return undefined;
        if (!target.delegates.has(property)) {
          target.delegates.set(property, new TableRepository(target.dbService.client, property, table, target.tenantContext));
        }

        return target.delegates.get(property);
      },
    });
  }

  get db() {
    return this.dbService.client;
  }

  async $transaction<T>(input: (tx: RepositoryService) => T | Promise<T>): Promise<T>;
  async $transaction(input: any[]): Promise<any[]>;
  async $transaction(input: any): Promise<any> {
    if (Array.isArray(input)) return Promise.all(input);
    return this.dbService.client.transaction(async (tx) => {
      const scoped = Object.create(RepositoryService.prototype) as RepositoryService;
      (scoped as any).dbService = { client: tx };
      (scoped as any).tenantContext = this.tenantContext;
      (scoped as any).delegates = new Map<string, TableRepository>();
      const proxy = new Proxy(scoped, {
        get: (target, property, receiver) => {
          if (typeof property !== 'string') return Reflect.get(target, property, receiver);
          if (property in target) return Reflect.get(target, property, receiver);
          const table = tableMap[property] ?? tableMap[lowerFirst(property)];
          if (!table) return undefined;
          if (!(target as any).delegates.has(property)) {
            (target as any).delegates.set(property, new TableRepository(tx, property, table, (target as any).tenantContext));
          }
          return (target as any).delegates.get(property);
        },
      });
      return input(proxy);
    });
  }

  async $queryRaw<T = any>(query: SQL): Promise<T>;
  async $queryRaw<T = any>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  async $queryRaw<T = any>(query: SQL | TemplateStringsArray, ...values: unknown[]): Promise<T> {
    const statement = Array.isArray(query) && 'raw' in query ? valuesForRaw(query, values) : (query as SQL);
    return this.dbService.client.execute(statement) as unknown as Promise<T>;
  }

  async $executeRaw<T = any>(query: SQL): Promise<T>;
  async $executeRaw<T = any>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  async $executeRaw<T = any>(query: SQL | TemplateStringsArray, ...values: unknown[]): Promise<T> {
    const statement = Array.isArray(query) && 'raw' in query ? valuesForRaw(query, values) : (query as SQL);
    return this.dbService.client.execute(statement) as unknown as Promise<T>;
  }

  async $executeRawUnsafe<T = unknown>(query: SQL | TemplateStringsArray | string, ...values: unknown[]): Promise<T> {
    if (typeof query === 'string') {
      return this.dbService.client.execute(sql.raw(query)) as unknown as Promise<T>;
    }
    return Array.isArray(query)
      ? this.$executeRaw<T>(query as TemplateStringsArray, ...values)
      : this.$executeRaw<T>(query as SQL);
  }
}

type RepositoryDelegates = {
  [K in keyof typeof schema]: TableRepository;
};

export interface RepositoryService extends RepositoryDelegates {}
