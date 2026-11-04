/**
 * Minimal stand-in for the Drizzle query builder used by unit specs.
 *
 * It is intentionally *not* a SQL engine: `where` clauses are opaque to it, so
 * tests declare the rows each query should return, in call order, per table.
 * That keeps unit specs about service behaviour (branching, validation, write
 * payloads) while the integration specs cover real SQL through Docker Postgres.
 */

type Row = Record<string, any>;
type Table = unknown;

export interface QueuedQuery {
  table: Table;
  selection?: Record<string, unknown>;
  joins: Table[];
  where?: unknown;
}

export interface RecordedInsert {
  table: Table;
  values: Row | Row[];
}

export interface RecordedUpdate {
  table: Table;
  values: Row;
  where?: unknown;
}

export interface FakeDb {
  client: any;
  /** Rows returned by the next `select().from(<table>)`, consumed per call. */
  queue(table: Table, rows: Row[]): FakeDb;
  /** Rows returned by `insert(<table>).values(...).returning()`. */
  insertReturning(table: Table, rows: Row | Row[] | (() => Row[])): FakeDb;
  selects: QueuedQuery[];
  inserts: RecordedInsert[];
  updates: RecordedUpdate[];
  deletes: { table: Table; where?: unknown }[];
  transactions: number;
  transaction<T>(fn: (tx: any) => Promise<T> | T): Promise<T>;
}

class FakeQuery {
  private table?: Table;

  constructor(
    private readonly db: FakeDbState,
    private readonly selection?: Record<string, unknown>,
  ) {}

  private record(table: Table, joins: Table[] = [], where?: unknown): FakeQuery {
    this.table = table;
    this.db.lastTable = table;
    this.db.selects.push({ table, selection: this.selection, joins, where });
    return this;
  }

  from(table: Table) {
    return this.record(table);
  }
  leftJoin(table: Table) {
    this.db.selects.push({ table: this.db.lastTable, selection: this.selection, joins: [table], where: undefined });
    return this;
  }
  where(where?: unknown) {
    this.db.lastWhere = where;
    const last = this.db.selects[this.db.selects.length - 1];
    if (last) last.where = where;
    return this;
  }
  orderBy() {
    return this;
  }
  limit() {
    return this;
  }
  offset() {
    return this;
  }
  $dynamic() {
    return this;
  }
  groupBy() {
    return this;
  }
  having() {
    return this;
  }
  for() {
    return this;
  }
  onConflictDoNothing() {
    return this;
  }
  set(values: Row) {
    return new FakeWrite(this.db, { kind: 'update', table: this.db.lastTable, values });
  }
  returning() {
    return this;
  }

  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((value: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.db.resolveSelect(this.table).then(onfulfilled, onrejected);
  }
  catch(onrejected?: any) {
    return this.then(undefined, onrejected);
  }
  finally(onfinally?: any) {
    return this.then().finally(onfinally);
  }
}

class FakeWrite {
  constructor(private readonly db: FakeDbState, private readonly write: RecordedInsert | RecordedUpdate) {}
  where(where?: unknown) {
    (this.write as any).where = where;
    return this;
  }
  returning() {
    return this;
  }
  onConflictDoNothing() {
    return this;
  }
  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((value: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    if ('kind' in this.write) {
      const { kind, table, values } = this.write as any;
      if (kind === 'update') this.db.updates.push({ table, values });
      else this.db.inserts.push({ table, values });
      return Promise.resolve(this.db.insertRows(table) as any).then(onfulfilled, onrejected);
    }
    return Promise.resolve([] as any).then(onfulfilled, onrejected);
  }
}

interface FakeDbState {
  queues: Map<Table, Row[][]>;
  insertResults: Map<Table, (Row | Row[] | (() => Row[]))>;
  selects: QueuedQuery[];
  inserts: RecordedInsert[];
  updates: RecordedUpdate[];
  deletes: { table: Table; where?: unknown }[];
  transactions: number;
  lastTable: Table;
  lastWhere?: unknown;
  resolveSelect(queryTable?: Table): Promise<Row[]>;
  insertRows(table: Table): Row[];
}

export function createFakeDb(): FakeDb {
  const state: FakeDbState = {
    queues: new Map(),
    insertResults: new Map(),
    selects: [],
    inserts: [],
    updates: [],
    deletes: [],
    transactions: 0,
    lastTable: undefined,
    lastWhere: undefined,
    resolveSelect(queryTable?: Table) {
      const table = queryTable ?? this.selects[this.selects.length - 1]?.table;
      const queued = table ? this.queues.get(table) : undefined;
      if (!queued || queued.length === 0) return Promise.resolve([]);
      return Promise.resolve(queued.length === 1 ? queued[0] : queued.shift()!);
    },
    insertRows(table) {
      const result = this.insertResults.get(table);
      const value = typeof result === 'function' ? result() : result;
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    },
  };

  const client: any = {
    select: (selection?: Record<string, unknown>) => new FakeQuery(state, selection),
    selectDistinct: (selection?: Record<string, unknown>) => new FakeQuery(state, selection),
    insert: (table: Table) => {
      state.lastTable = table;
      return {
        values: (values: Row | Row[]) => {
          state.inserts.push({ table, values });
          return new FakeWrite(state, { kind: 'insert', table, values } as any);
        },
      };
    },
    update: (table: Table) => {
      state.lastTable = table;
      return new FakeQuery(state);
    },
    delete: (table: Table) => {
      state.lastTable = table;
      return {
        where: (where?: unknown) => {
          state.deletes.push({ table, where });
          return Promise.resolve([]);
        },
      };
    },
    transaction: (fn: (tx: any) => Promise<any> | any) => {
      state.transactions += 1;
      return Promise.resolve(fn(client));
    },
    execute: (_sql: any) => Promise.resolve([]),
  };

  const db: FakeDb = {
    client,
    queue(table, rows) {
      const existing = state.queues.get(table) ?? [];
      existing.push(rows);
      state.queues.set(table, existing);
      return db;
    },
    insertReturning(table, rows) {
      state.insertResults.set(table, rows);
      return db;
    },
    get selects() {
      return state.selects;
    },
    get inserts() {
      return state.inserts;
    },
    get updates() {
      return state.updates;
    },
    get deletes() {
      return state.deletes;
    },
    get transactions() {
      return state.transactions;
    },
    transaction: (fn) => client.transaction(fn),
  };

  return db;
}
