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
  if (!table || typeof table !== 'object') return undefined;
  try {
    return getTableColumns(table) as Record<string, any>;
  } catch {
    return undefined;
  }
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

function expandedRelationNames(value: string) {
  const set = relationNames(value);
  for (const token of camelTokens(value)) {
    const tokenSingular = singularize(token);
    set.add(token);
    set.add(tokenSingular);
    set.add(`${token}s`);
    set.add(`${tokenSingular}s`);
  }
  return set;
}

function camelTokens(value: string) {
  return value
    .split(/(?=[A-Z])/)
    .map((part) => lowerFirst(part));
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

function splitSelection(select?: Record<string, any>) {
  const columns: Record<string, boolean> = {};
  const relationIncludes: Record<string, any> = {};
  if (!select) return { columns: undefined, relationIncludes };
  for (const [key, value] of Object.entries(select)) {
    if (typeof value === 'boolean') columns[key] = value;
    else if (value && typeof value === 'object') relationIncludes[key] = value;
    else columns[key] = Boolean(value);
  }
  return { columns, relationIncludes };
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

function tenantScopedData(table: any, data: Record<string, any>, tenantId?: bigint, systemContext = false) {
  if (!tableColumns(table).tenantId) return data;
  if (systemContext && data.tenantId === undefined) {
    throw new Error('System context requires an explicit tenantId for tenant-scoped writes');
  }
  if (tenantId && data.tenantId !== undefined && BigInt(data.tenantId) !== tenantId) {
    throw new Error('Tenant mismatch: the record belongs to a different tenant');
  }
  if (!tenantId || data.tenantId !== undefined) return data;
  return { ...data, tenantId };
}

function valuesForRaw(strings: TemplateStringsArray, values: unknown[]) {
  return strings.reduce((query, chunk, index) => sql`${query}${sql.raw(chunk)}${index < values.length ? values[index] : sql.raw('')}`, sql``);
}

function contextTenantId(tenantContext?: TenantContextService) {
  const context = tenantContext?.get();
  return context && 'tenantId' in context ? context.tenantId : undefined;
}

class TableRepository {
  constructor(
    protected readonly db: DbLike,
    protected readonly tableName: string,
    protected readonly table: any,
    protected readonly tenantContext?: TenantContextService,
  ) {}

  public async scopedWhere(where?: Record<string, any>) {
    const context = this.tenantContext?.get();
    if (context?.scope === 'system') return where;
    const tenantId = context?.tenantId;
    if (!tenantId) return where;

    if (this.tableName === 'profile') {
      const memberships = await this.db
        .select({ profileId: tableColumns(tableMap.tenantMembership).profileId })
        .from(tableMap.tenantMembership)
        .where(
          and(
            eq(tableColumns(tableMap.tenantMembership).tenantId, tenantId),
            eq(tableColumns(tableMap.tenantMembership).status, 'active'),
          ),
        );
      return tenantScopedWhere(this.table, {
        AND: [{ id: { in: memberships.map((row: any) => row.profileId) } }, ...(where ? [where] : [])],
      }, tenantId);
    }

    if (this.tableName === 'organization') {
      const organizations = await this.db
        .select({ organizationId: tableColumns(tableMap.tenantOrganization).organizationId })
        .from(tableMap.tenantOrganization)
        .where(eq(tableColumns(tableMap.tenantOrganization).tenantId, tenantId));
      return tenantScopedWhere(this.table, {
        AND: [{ id: { in: organizations.map((row: any) => row.organizationId) } }, ...(where ? [where] : [])],
      }, tenantId);
    }

    return tenantScopedWhere(this.table, where, tenantId);
  }

  async findMany(args: QueryArgs = {}): Promise<any[]> {
    const { columns, relationIncludes } = splitSelection(args?.select);
    let query = this.db.select(buildColumns(this.table, columns)).from(this.table).$dynamic();
    const where = buildWhere(this.table, await this.scopedWhere(args?.where));
    const orderBy = buildOrderBy(this.table, args?.orderBy);
    if (where) query = query.where(where);
    if (orderBy?.length) query = query.orderBy(...orderBy);
    if (args?.skip != null) query = query.offset(Number(args.skip));
    if (args?.take != null) query = query.limit(Math.abs(Number(args.take)));
    const rows = await query;
    return this.attachIncludes(rows, { ...relationIncludes, ...(args?.include ?? {}) });
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
    const where = buildWhere(this.table, await this.scopedWhere(args?.where));
    if (where) query = query.where(where);
    const rows = await query;
    return Number(rows[0]?.value ?? 0);
  }

  async create(args: QueryArgs = {}): Promise<any> {
    const systemContext = this.tenantContext?.get()?.scope === 'system';
    const tenantId = systemContext ? undefined : contextTenantId(this.tenantContext);
    const rows = await this.db.insert(this.table).values(
      cleanData(tenantScopedData(this.table, args?.data ?? {}, tenantId, systemContext)),
    ).returning();
    const result = rows[0] ?? null;
    return this.attachInclude(result, args?.include);
  }

  async createMany(args: QueryArgs = {}): Promise<{ count: number }> {
    const data = Array.isArray(args?.data) ? args.data : [args?.data].filter(Boolean);
    if (data.length === 0) return { count: 0 };
    const systemContext = this.tenantContext?.get()?.scope === 'system';
    const tenantId = systemContext ? undefined : contextTenantId(this.tenantContext);
    await this.db.insert(this.table).values(
      data.map((entry: Record<string, any>) =>
        cleanData(tenantScopedData(this.table, entry, tenantId, systemContext)),
      ),
    );
    return { count: data.length };
  }

  async update(args: QueryArgs = {}): Promise<any> {
    let query = this.db.update(this.table).set(cleanData(args?.data ?? {})).returning().$dynamic();
    const where = buildWhere(this.table, await this.scopedWhere(args?.where));
    if (where) query = query.where(where);
    const rows = await query;
    return this.attachInclude(rows[0] ?? null, args?.include);
  }

  async updateMany(args: QueryArgs = {}): Promise<{ count: number }> {
    let query = this.db.update(this.table).set(cleanData(args?.data ?? {})).$dynamic();
    const where = buildWhere(this.table, await this.scopedWhere(args?.where));
    if (where) query = query.where(where);
    const result = await query;
    return { count: Number(result?.rowCount ?? 0) };
  }

  async delete(args: QueryArgs = {}): Promise<any> {
    let query = this.db.delete(this.table).returning().$dynamic();
    const where = buildWhere(this.table, await this.scopedWhere(args?.where));
    if (where) query = query.where(where);
    const rows = await query;
    return rows[0] ?? null;
  }

  async deleteMany(args: QueryArgs = {}): Promise<{ count: number }> {
    let query = this.db.delete(this.table).$dynamic();
    const where = buildWhere(this.table, await this.scopedWhere(args?.where));
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
    const columns = tableColumns(this.table);
    const sums = Object.keys(args?._sum ?? {}).filter((key) => columns[key]);
    const avgs = Object.keys(args?._avg ?? {}).filter((key) => columns[key]);
    const mins = Object.keys(args?._min ?? {}).filter((key) => columns[key]);
    const maxs = Object.keys(args?._max ?? {}).filter((key) => columns[key]);
    if (!sums.length && !avgs.length && !mins.length && !maxs.length) {
      const total = await this.count({ where: args?.where });
      return { _count: { _all: total } };
    }
    const selection: Record<string, any> = {};
    for (const key of sums) selection[`_sum_${key}`] = sql`sum(${columns[key]})`;
    for (const key of avgs) selection[`_avg_${key}`] = sql`avg(${columns[key]})`;
    for (const key of mins) selection[`_min_${key}`] = sql`min(${columns[key]})`;
    for (const key of maxs) selection[`_max_${key}`] = sql`max(${columns[key]})`;
    if (args?._count) selection._count = drizzleCount();
    const where = buildWhere(this.table, await this.scopedWhere(args?.where));
    let query = this.db.select(selection).from(this.table).$dynamic();
    if (where) query = query.where(where);
    const row = (await query)[0] ?? {};
    const mapped: Record<string, any> = {};
    if (sums.length) {
      mapped._sum = {};
      for (const key of sums) mapped._sum[key] = row[`_sum_${key}`] ?? null;
    }
    if (avgs.length) {
      mapped._avg = {};
      for (const key of avgs) mapped._avg[key] = row[`_avg_${key}`] ?? null;
    }
    if (mins.length) {
      mapped._min = {};
      for (const key of mins) mapped._min[key] = row[`_min_${key}`] ?? null;
    }
    if (maxs.length) {
      mapped._max = {};
      for (const key of maxs) mapped._max[key] = row[`_max_${key}`] ?? null;
    }
    if (args?._count) mapped._count = { _all: Number(row._count ?? 0) };
    return mapped;
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
    const where = buildWhere(this.table, await this.scopedWhere(args?.where));
    if (where) query = query.where(where);
    if (by.length) query = query.groupBy(...compact(by.map((key) => columns[key])));
    const rows = await query;
    return rows.map((row: any) => {
      const mapped = { ...row };
      if (args?._sum) {
        mapped._sum = {};
        for (const key of Object.keys(args._sum)) mapped._sum[key] = row[`_sum_${key}`] ?? null;
      }
      if (args?._count) mapped._count = { _all: row._count ?? 0 };
      return mapped;
    });
  }

  public async attachIncludes<T>(rows: T[], include?: Record<string, any>): Promise<T[]> {
    if (!rows.length || !include) return rows;
    const decorated: Array<{ row: Record<string, any>; result: Record<string, any> }> =
      rows.map((row) => ({ row: row as Record<string, any>, result: { ...(row as Record<string, any>) } }));

    for (const [relationName, relationArgs] of Object.entries(include)) {
      if (relationName === '_count') {
        for (const entry of decorated) {
          entry.result._count = await this.loadRelationCounts(entry.result, relationArgs as any);
        }
        continue;
      }

      const args = relationArgs === true ? {} : (relationArgs ?? {});
      const relation = this.resolveRelation(relationName, decorated[0].result);
      if (!relation) continue;

      const valueFor = (row: Record<string, any>) =>
        relation.many ? row.id : relation.foreignValue(row);

      const sourceKeys = decorated.map((entry) => valueFor(entry.row)).filter((value) => value != null);

      const distinctKeys = Array.from(new Set(sourceKeys));
      if (distinctKeys.length === 0) {
        for (const entry of decorated) {
          entry.result[relationName] = relation.many ? [] : null;
        }
        continue;
      }

      const relatedRows = await relation.repository.findMany({
        where: { AND: [args.where ?? {}, { [relation.foreignKey]: { in: distinctKeys } }] },
        select: args.select,
        include: args.include,
        orderBy: args.orderBy,
      });

      const grouped = new Map<string, any[]>();
      const byId = new Map<string, any>();
      for (const related of relatedRows) {
        const key = String(relation.many ? related[relation.foreignKey] : related.id);
        if (relation.many) {
          const bucket = grouped.get(key);
          if (bucket) bucket.push(related);
          else grouped.set(key, [related]);
        } else {
          byId.set(key, related);
        }
      }

      for (const entry of decorated) {
        const key = String(valueFor(entry.row));
        entry.result[relationName] = relation.many
          ? grouped.get(key) ?? []
          : byId.get(key) ?? null;
      }
    }

    return decorated.map((entry) => entry.result);
  }

  public async attachInclude<T>(row: T, include?: Record<string, any>): Promise<T> {
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
        where: {
          ...(args.where ?? {}),
          [relation.foreignKey]: relation.foreignValue(result),
        },
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

    const singularName = singularize(lowerFirst(relationName));

    if (singularName === 'user' && sourceColumns.userId && tableMap.profile) {
      return {
        repository: new TableRepository(this.db, 'profile', tableMap.profile, this.tenantContext),
        foreignKey: 'id',
        foreignValue: (value: Record<string, any>) => value.userId,
        many: false,
      };
    }

    const directKey = [...names].map((name) => `${name}Id`).find((key) => sourceColumns[key]);
    if (directKey) {
      const resolved = this.resolveDirectKeyTarget(directKey, names, sourceColumns);
      if (resolved) {
        return {
          repository: new TableRepository(this.db, resolved.tableName, resolved.target, this.tenantContext),
          foreignKey: 'id',
          foreignValue: (value: Record<string, any>) => value[directKey],
          many: false,
        };
      }
    }

    if (sourceId === undefined) return undefined;

    const aliasDirectKey = this.resolveAliasDirectKey(relationName, names, sourceColumns);
    if (aliasDirectKey) {
      return {
        repository: new TableRepository(this.db, aliasDirectKey.tableName, aliasDirectKey.target, this.tenantContext),
        foreignKey: 'id',
        foreignValue: (value: Record<string, any>) => value[aliasDirectKey.column],
        many: false,
      };
    }

    if (singularName === 'member') {
      const sourceName = lowerFirst(this.tableName);
      for (const [joinTableName, table] of Object.entries(tableMap)) {
        if (table === this.table || joinTableName === this.tableName) continue;
        const columns = tableColumns(table);
        if (!columns) continue;
        const fk = [`${sourceName}Id`, `${singularize(sourceName)}Id`].find((key) => columns[key]);
        if (fk && columns.userId) {
          return {
            repository: new TableRepository(this.db, joinTableName, table, this.tenantContext),
            foreignKey: fk,
            foreignValue: () => sourceId,
            many: true,
          };
        }
      }
      return undefined;
    }

    for (const candidateName of names) {
      const target = tableMap[candidateName];
      if (!target || target === this.table) continue;
      const directKey = [...names].map((name) => `${name}Id`).find((key) => sourceColumns[key]);
      if (directKey) {
        return {
          repository: new TableRepository(this.db, candidateName, target, this.tenantContext),
          foreignKey: 'id',
          foreignValue: (value: Record<string, any>) => value[directKey],
          many: false,
        };
      }
    }

    if (sourceId === undefined) return undefined;

    for (const candidateName of names) {
      const target = tableMap[candidateName];
      if (!target || target === this.table) continue;
      const targetColumns = tableColumns(target);
      const reverseKey = [`${lowerFirst(this.tableName)}Id`, `${singularize(lowerFirst(this.tableName))}Id`, 'userId']
        .find((key) => targetColumns[key]);
      if (reverseKey) {
        const reverseColumn = targetColumns[reverseKey];
        return {
          repository: new TableRepository(this.db, candidateName, target, this.tenantContext),
          foreignKey: reverseKey,
          foreignValue: () => sourceId,
          many: typeof reverseColumn?.isUnique !== 'boolean' || !reverseColumn.isUnique,
        };
      }
    }

    return this.resolveJoinRelation(relationName, row, names, sourceId);
  }

  private resolveDirectKeyTarget(
    directKey: string,
    names: Set<string>,
    sourceColumns: Record<string, any>,
  ): { tableName: string; target: any } | undefined {
    const fkColumn = sourceColumns[directKey];
    const fkType = fkColumn?.dataType;
    const nameTargets = [...names]
      .map((name) => ({ name, target: tableMap[name] }))
      .filter((entry): entry is { name: string; target: any } => Boolean(entry.target) && entry.target !== this.table);

    const typeMatches = (name: string, target: any) => {
      if (!fkType) return false;
      const idColumn = tableColumns(target)?.id;
      return Boolean(idColumn && (idColumn as any).dataType === fkType);
    };

    const exactType = nameTargets.find((entry) => typeMatches(entry.name, entry.target));
    if (exactType) return { tableName: exactType.name, target: exactType.target };

    const baseNames = new Set<string>();
    for (const name of names) {
      baseNames.add(singularize(name));
      baseNames.add(singularize(name) + 's');
      baseNames.add(lowerFirst(name));
    }
    const broad = Object.entries(tableMap)
      .filter(([tableName, target]) => {
        if (!target || target === this.table) return false;
        if (!typeMatches(tableName, target)) return false;
        const lower = tableName.toLowerCase();
        return [...baseNames].some((base) => lower === base.toLowerCase() || lower.endsWith(base.toLowerCase()));
      })
      .sort((a, b) => a[0].length - b[0].length);
    if (broad.length > 0) return { tableName: broad[0][0], target: broad[0][1] };

    if (fkType) return undefined;
    const fallback = nameTargets[0];
    if (fallback) return { tableName: fallback.name, target: fallback.target };
    return undefined;
  }

  private resolveAliasDirectKey(
    relationName: string,
    names: Set<string>,
    sourceColumns: Record<string, any>,
  ): { tableName: string; target: any; column: string } | undefined {
    const candidates = new Set<string>([...names, relationName]);
    for (const name of candidates) {
      if (sourceColumns[`${name}Id`]) {
        const resolved = this.resolveAliasTarget(name);
        if (resolved) return { ...resolved, column: `${name}Id` };
      }
      if (sourceColumns[`${name}UserId`]) {
        const resolved = this.resolveAliasTarget(`${name}User`);
        if (resolved) return { ...resolved, column: `${name}UserId` };
      }
    }
    return undefined;
  }

  private resolveAliasTarget(alias: string): { tableName: string; target: any } | undefined {
    const normalized = lowerFirst(alias);
    if (tableMap[normalized] && tableMap[normalized] !== this.table) {
      return { tableName: normalized, target: tableMap[normalized] };
    }
    const tokens = camelTokens(normalized);
    const candidates = new Set<string>();
    for (let i = tokens.length - 1; i >= 0; i--) candidates.add(tokens.slice(i).join(''));
    if (normalized.endsWith('User')) candidates.add('user');

    for (const targetName of candidates) {
      if (targetName === 'user' || targetName === 'users') {
        if (tableMap.profile) return { tableName: 'profile', target: tableMap.profile };
      }
      const target = tableMap[targetName];
      if (target && target !== this.table) return { tableName: targetName, target };
    }
    return undefined;
  }

  private resolveJoinRelation(
    relationName: string,
    row: Record<string, any>,
    names: Set<string>,
    sourceId: any,
  ) {
    const sourceKeyNames = relationNames(this.tableName);
    const sourceForeignKeys = [...sourceKeyNames].map((name) => `${name}Id`);
    if (this.tableName === 'profile' && !sourceForeignKeys.includes('userId')) {
      sourceForeignKeys.push('userId');
    }
    const targetName = [...expandedRelationNames(relationName)]
      .map((name) => tableMap[name] ? name : undefined)
      .find(Boolean);
    if (!targetName) return undefined;
    const target = tableMap[targetName];

    const candidates: Array<{
      joinTable: any;
      sourceForeignKey: string;
      targetForeignKey: string;
      joinName: string;
      nameScore: number;
      extra: number;
    }> = [];
    const sourceName = lowerFirst(this.tableName);
    const singularSourceName = singularize(sourceName);
    const targetNameLower = lowerFirst(targetName);
    const targetSingular = singularize(targetNameLower);
    for (const [joinName, joinTable] of Object.entries(tableMap)) {
      if (joinTable === this.table || joinTable === target) continue;
      const joinColumns = tableColumns(joinTable);
      if (!joinColumns) continue;
      const sourceForeignKey = sourceForeignKeys.find((key) => joinColumns[key]);
      const targetForeignKey = [...relationNames(targetName)].map((name) => `${name}Id`).find((key) => joinColumns[key]);
      if (!sourceForeignKey || !targetForeignKey) continue;
      const metadata = new Set([
        'id', 'tenantId', 'createdAt', 'updatedAt', 'assignedAt', 'isActive',
        'isPrimary', 'isPrimaryRole', 'status', sourceForeignKey, targetForeignKey,
      ]);
      const extra = Object.keys(joinColumns).filter((key) => !metadata.has(key)).length;
      const joinLower = joinName.toLowerCase();
      const nameScore =
        [sourceName, singularSourceName].filter((name) => joinLower.includes(name)).length +
        [targetNameLower, targetSingular].filter((name) => joinLower.includes(name)).length;
      candidates.push({ joinTable, sourceForeignKey, targetForeignKey, joinName, nameScore, extra });
    }

    candidates.sort((a, b) => b.nameScore - a.nameScore || a.extra - b.extra);
    const best = candidates.find((c) => c.nameScore >= 2 || c.extra <= 2);
    if (!best) return undefined;

    return {
      repository: new JoinTableRepository(
        this.db,
        best.joinTable,
        target,
        best.sourceForeignKey,
        best.targetForeignKey,
        sourceId,
        this.tenantContext,
      ),
      foreignKey: best.sourceForeignKey,
      foreignValue: () => sourceId,
      many: true,
    };
  }

  private async loadRelationCounts(row: Record<string, any>, args: any) {
    const select = args?.select ?? {};
    const counts: Record<string, number> = {};
    for (const [relationName, enabled] of Object.entries(select)) {
      if (!enabled) continue;
      const relation = this.resolveRelation(relationName, row);
      if (!relation) continue;
      counts[relationName] = await relation.repository.count({
        where: { [relation.foreignKey]: relation.foreignValue(row) },
      });
    }
    return counts;
  }
}

function requireRawTenantContext(tenantContext?: TenantContextService) {
  if (!tenantContext) throw new Error('Tenant context is required for raw database operations');
  const context = tenantContext.get();
  if (!context) throw new Error('Tenant or system context is required for raw database operations');
  return context;
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
    const columns = tableColumns(this.joinTable);
    let query = this.db.select().from(this.joinTable).$dynamic();
    const scoped = await this.scopedWhere(args?.where);
    const where = buildWhere(this.joinTable, scoped);
    if (where) query = query.where(where);
    const orderBy = buildOrderBy(this.joinTable, args?.orderBy);
    if (orderBy?.length) query = query.orderBy(...orderBy);
    if (args?.skip != null) query = query.offset(Number(args.skip));
    if (args?.take != null) query = query.limit(Math.abs(Number(args.take)));
    const rows = await query;

    const joinName = Object.entries(tableMap).find(([, entry]) => entry === this.joinTable)?.[0];
    if (!joinName) return rows;
    const joinRepository = new TableRepository(this.db, joinName, this.joinTable, this.tenantContext);
    return joinRepository.attachIncludes(rows, args?.include);
  }

  async count(args: QueryArgs = {}): Promise<number> {
    const columns = tableColumns(this.joinTable);
    let query = this.db.select({ value: drizzleCount() }).from(this.joinTable).$dynamic();
    const scoped = await this.scopedWhere(args?.where);
    const where = buildWhere(this.joinTable, scoped);
    if (where) query = query.where(where);
    const rows = await query;
    return Number(rows[0]?.value ?? 0);
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
    requireRawTenantContext(this.tenantContext);
    const statement = Array.isArray(query) && 'raw' in query ? valuesForRaw(query, values) : (query as SQL);
    const result = await this.dbService.client.execute(statement) as unknown;
    if (Array.isArray(result)) return result as T;
    return (result && typeof result === 'object' && 'rows' in result ? (result as { rows: T }).rows : result) as T;
  }

  async $executeRaw<T = any>(query: SQL): Promise<T>;
  async $executeRaw<T = any>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  async $executeRaw<T = any>(query: SQL | TemplateStringsArray, ...values: unknown[]): Promise<T> {
    requireRawTenantContext(this.tenantContext);
    const statement = Array.isArray(query) && 'raw' in query ? valuesForRaw(query, values) : (query as SQL);
    return this.dbService.client.execute(statement) as unknown as Promise<T>;
  }
}

type RepositoryDelegates = {
  [K in keyof typeof schema]: TableRepository;
};

export interface RepositoryService extends RepositoryDelegates {}
