import Dexie, { type IndexableType, type Table, type UpdateSpec } from 'dexie';
import type { Board, Card, Column } from '../types';

type TableMap = {
  boards: Board;
  columns: Column;
  cards: Card;
};

type TableName = keyof TableMap;
type Entity = TableMap[TableName];
type SortDirection = 1 | -1;

type Query<T> = Partial<Record<keyof T, unknown>>;
type Sort<T> = Partial<Record<keyof T, SortDirection>>;

type MoxtCollection<T extends { id: string }> = {
  find(query?: Query<T>, options?: { sort?: Sort<T> }): Promise<T[]>;
  insertOne(document: T): Promise<unknown>;
  updateOne(filter: Query<T>, update: { $set: Partial<T> }): Promise<unknown>;
  deleteOne(filter: Query<T>): Promise<unknown>;
};

type MoxtApi = {
  collection<T extends { id: string }>(name: string): MoxtCollection<T>;
  on?(
    event: 'data:change',
    callback: (payload: { path: string }) => void | Promise<void>,
  ): () => void;
};

type DbWhereEquals<T extends Entity> = {
  toArray(): Promise<T[]>;
  sortBy<K extends keyof T>(field: K): Promise<T[]>;
  delete(): Promise<number>;
};

type DbWhereClause<T extends Entity> = {
  equals(value: unknown): DbWhereEquals<T>;
  aboveOrEqual(value: unknown): DbWhereEquals<T>;
};

type DbOrderByArray<T extends Entity> = {
  toArray(): Promise<T[]>;
};

type DbOrderByClause<T extends Entity> = {
  reverse(): DbOrderByArray<T>;
  toArray(): Promise<T[]>;
};

export type DbTable<T extends Entity> = {
  add(item: T): Promise<string>;
  bulkAdd(items: T[]): Promise<void>;
  bulkPut(items: T[]): Promise<void>;
  count(): Promise<number>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<T | undefined>;
  orderBy<K extends keyof T>(field: K): DbOrderByClause<T>;
  update(id: string, changes: Partial<T>): Promise<number>;
  where<K extends keyof T>(field: K): DbWhereClause<T>;
};

type DbAdapter = {
  readonly provider: 'indexeddb' | 'moxt';
  table<K extends TableName>(name: K): DbTable<TableMap[K]>;
  transaction(
    mode: 'rw' | 'r',
    tableNames: TableName[],
    action: () => Promise<unknown>,
  ): Promise<unknown>;
};

class DexieDatabase extends Dexie {
  boards!: Table<Board, string>;
  columns!: Table<Column, string>;
  cards!: Table<Card, string>;

  constructor() {
    super('kanban-db');

    this.version(1).stores({
      boards: 'id, name, createdAt, updatedAt',
      columns: 'id, boardId, [boardId+order], createdAt, updatedAt',
      cards:
        'id, boardId, columnId, [columnId+order], dueDate, priority, createdAt, updatedAt',
    });

    this.version(2)
      .stores({
        boards: 'id, name, deletedAt, createdAt, updatedAt',
        columns:
          'id, boardId, [boardId+order], deletedAt, createdAt, updatedAt',
        cards:
          'id, boardId, columnId, [columnId+order], dueDate, priority, deletedAt, createdAt, updatedAt',
      })
      .upgrade((tx) => {
        return Promise.all([
          tx.table('boards').toCollection().modify({ deletedAt: null }),
          tx.table('columns').toCollection().modify({ deletedAt: null }),
          tx.table('cards').toCollection().modify({ deletedAt: null }),
        ]);
      });

    // v3: add compound [boardId+updatedAt] index to columns and cards for
    // efficient incremental-sync range queries.
    this.version(3).stores({
      boards: 'id, name, deletedAt, createdAt, updatedAt',
      columns:
        'id, boardId, [boardId+order], [boardId+updatedAt], deletedAt, createdAt, updatedAt',
      cards:
        'id, boardId, columnId, [columnId+order], [boardId+updatedAt], dueDate, priority, deletedAt, createdAt, updatedAt',
    });
  }
}

class DexieTableAdapter<T extends Entity> implements DbTable<T> {
  constructor(private readonly tableRef: Table<T, string>) {}

  async add(item: T): Promise<string> {
    return this.tableRef.add(item);
  }

  async bulkAdd(items: T[]): Promise<void> {
    await this.tableRef.bulkAdd(items);
  }

  async bulkPut(items: T[]): Promise<void> {
    await this.tableRef.bulkPut(items);
  }

  async count(): Promise<number> {
    return this.tableRef.count();
  }

  async delete(id: string): Promise<void> {
    await this.tableRef.delete(id);
  }

  async get(id: string): Promise<T | undefined> {
    return this.tableRef.get(id);
  }

  orderBy<K extends keyof T>(field: K): DbOrderByClause<T> {
    const collection = this.tableRef.orderBy(field as string);

    return {
      reverse: () => ({
        toArray: () => collection.reverse().toArray(),
      }),
      toArray: () => collection.toArray(),
    };
  }

  async update(id: string, changes: Partial<T>): Promise<number> {
    return this.tableRef.update(id, changes as UpdateSpec<T>);
  }

  where<K extends keyof T>(field: K): DbWhereClause<T> {
    return {
      equals: (value: unknown) => {
        const collection = this.tableRef
          .where(field as string)
          .equals(value as IndexableType);

        return {
          toArray: () => collection.toArray(),
          sortBy: <S extends keyof T>(sortField: S) =>
            collection.sortBy(sortField as string),
          delete: () => collection.delete(),
        };
      },
      aboveOrEqual: (value: unknown) => {
        const collection = this.tableRef
          .where(field as string)
          .aboveOrEqual(value as IndexableType);

        return {
          toArray: () => collection.toArray(),
          sortBy: <S extends keyof T>(sortField: S) =>
            collection.sortBy(sortField as string),
          delete: () => collection.delete(),
        };
      },
    };
  }
}

class DexieAdapter implements DbAdapter {
  readonly provider = 'indexeddb' as const;

  private readonly database = new DexieDatabase();

  private readonly tables: {
    [K in TableName]: DexieTableAdapter<TableMap[K]>;
  } = {
    boards: new DexieTableAdapter(this.database.boards),
    columns: new DexieTableAdapter(this.database.columns),
    cards: new DexieTableAdapter(this.database.cards),
  };

  table<K extends TableName>(name: K): DbTable<TableMap[K]> {
    return this.tables[name];
  }

  private getTableRef(name: TableName): Table<Entity, string> {
    switch (name) {
      case 'boards':
        return this.database.boards as Table<Entity, string>;
      case 'columns':
        return this.database.columns as Table<Entity, string>;
      case 'cards':
        return this.database.cards as Table<Entity, string>;
    }
  }

  async transaction(
    mode: 'rw' | 'r',
    tableNames: TableName[],
    action: () => Promise<unknown>,
  ): Promise<unknown> {
    const tableRefs = tableNames.map((name) => this.getTableRef(name));
    return (
      this.database.transaction as (...args: unknown[]) => Promise<unknown>
    )(mode, ...tableRefs, action);
  }
}

class MoxtTableAdapter<T extends Entity> implements DbTable<T> {
  constructor(private readonly collection: MoxtCollection<T>) {}

  private async upsert(item: T): Promise<void> {
    const existing = await this.collection.find({ id: item.id } as Query<T>);
    if (existing.length > 0) {
      await this.collection.updateOne({ id: item.id } as Query<T>, {
        $set: item,
      });
      return;
    }

    await this.collection.insertOne(item);
  }

  async add(item: T): Promise<string> {
    await this.collection.insertOne(item);
    return item.id;
  }

  async bulkAdd(items: T[]): Promise<void> {
    await Promise.all(items.map((item) => this.collection.insertOne(item)));
  }

  async bulkPut(items: T[]): Promise<void> {
    for (const item of items) {
      await this.upsert(item);
    }
  }

  async count(): Promise<number> {
    const rows = await this.collection.find({} as Query<T>);
    return rows.length;
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ id } as Query<T>);
  }

  async get(id: string): Promise<T | undefined> {
    const rows = await this.collection.find({ id } as Query<T>);
    return rows[0];
  }

  orderBy<K extends keyof T>(field: K): DbOrderByClause<T> {
    return {
      reverse: () => ({
        toArray: () =>
          this.collection.find({} as Query<T>, {
            sort: { [field]: -1 } as Sort<T>,
          }),
      }),
      toArray: () =>
        this.collection.find({} as Query<T>, {
          sort: { [field]: 1 } as Sort<T>,
        }),
    };
  }

  async update(id: string, changes: Partial<T>): Promise<number> {
    await this.collection.updateOne({ id } as Query<T>, { $set: changes });
    return 1;
  }

  where<K extends keyof T>(field: K): DbWhereClause<T> {
    return {
      equals: (value: unknown) => {
        const query = { [field]: value } as Query<T>;

        return {
          toArray: () => this.collection.find(query),
          sortBy: <S extends keyof T>(sortField: S) =>
            this.collection.find(query, {
              sort: { [sortField]: 1 } as Sort<T>,
            }),
          delete: async () => {
            const rows = await this.collection.find(query);
            await Promise.all(
              rows.map((row) =>
                this.collection.deleteOne({ id: row.id } as Query<T>),
              ),
            );
            return rows.length;
          },
        };
      },
      aboveOrEqual: (value: unknown) => {
        const fieldKey = field as string;
        const compareVal = String(value);

        const filterGte = (rows: T[]) =>
          rows.filter(
            (row) =>
              String((row as Record<string, unknown>)[fieldKey]) >= compareVal,
          );

        return {
          toArray: async () => {
            const rows = await this.collection.find({} as Query<T>);
            return filterGte(rows);
          },
          sortBy: async <S extends keyof T>(sortField: S) => {
            const rows = await this.collection.find({} as Query<T>, {
              sort: { [sortField]: 1 } as Sort<T>,
            });
            return filterGte(rows);
          },
          delete: async () => {
            const rows = await this.collection.find({} as Query<T>);
            const toDelete = filterGte(rows);
            await Promise.all(
              toDelete.map((row) =>
                this.collection.deleteOne({ id: row.id } as Query<T>),
              ),
            );
            return toDelete.length;
          },
        };
      },
    };
  }
}

class MoxtAdapter implements DbAdapter {
  readonly provider = 'moxt' as const;

  private readonly tables: { [K in TableName]: MoxtTableAdapter<TableMap[K]> };

  constructor(private readonly api: MoxtApi) {
    this.tables = {
      boards: new MoxtTableAdapter<Board>(this.api.collection<Board>('boards')),
      columns: new MoxtTableAdapter<Column>(
        this.api.collection<Column>('columns'),
      ),
      cards: new MoxtTableAdapter<Card>(this.api.collection<Card>('cards')),
    };
  }

  table<K extends TableName>(name: K): DbTable<TableMap[K]> {
    return this.tables[name];
  }

  async transaction(
    _mode: 'rw' | 'r',
    _tableNames: TableName[],
    action: () => Promise<unknown>,
  ): Promise<unknown> {
    return action();
  }
}

class TableFacade<K extends TableName> implements DbTable<TableMap[K]> {
  constructor(public readonly tableName: K) {}

  private get table(): DbTable<TableMap[K]> {
    return activeAdapter.table(this.tableName);
  }

  add(item: TableMap[K]): Promise<string> {
    return this.table.add(item);
  }

  bulkAdd(items: TableMap[K][]): Promise<void> {
    return this.table.bulkAdd(items);
  }

  bulkPut(items: TableMap[K][]): Promise<void> {
    return this.table.bulkPut(items);
  }

  count(): Promise<number> {
    return this.table.count();
  }

  delete(id: string): Promise<void> {
    return this.table.delete(id);
  }

  get(id: string): Promise<TableMap[K] | undefined> {
    return this.table.get(id);
  }

  orderBy<Field extends keyof TableMap[K]>(
    field: Field,
  ): DbOrderByClause<TableMap[K]> {
    return this.table.orderBy(field);
  }

  update(id: string, changes: Partial<TableMap[K]>): Promise<number> {
    return this.table.update(id, changes);
  }

  where<Field extends keyof TableMap[K]>(
    field: Field,
  ): DbWhereClause<TableMap[K]> {
    return this.table.where(field);
  }
}

const dexieAdapter = new DexieAdapter();
let activeAdapter: DbAdapter = dexieAdapter;

function resolveMoxtApi(): MoxtApi | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const maybeApi = (window as Window & { moxt?: MoxtApi }).moxt;
  return maybeApi ?? null;
}

export async function initializeDatabase(): Promise<void> {
  const moxtApi = resolveMoxtApi();
  activeAdapter = moxtApi ? new MoxtAdapter(moxtApi) : dexieAdapter;
}

export const db = {
  boards: new TableFacade('boards'),
  columns: new TableFacade('columns'),
  cards: new TableFacade('cards'),
  get provider(): 'indexeddb' | 'moxt' {
    return activeAdapter.provider;
  },
  async transaction(
    mode: 'rw' | 'r',
    ...args: [...TableFacade<TableName>[], () => Promise<unknown>]
  ): Promise<unknown> {
    const tables = args.slice(0, -1) as TableFacade<TableName>[];
    const action = args[args.length - 1] as
      | (() => Promise<unknown>)
      | undefined;
    if (!action) {
      throw new Error('A transaction callback is required.');
    }

    const tableNames = tables.map((item) => item.tableName);

    return activeAdapter.transaction(mode, tableNames, action);
  },
};
