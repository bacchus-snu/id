import * as pg from 'pg'

export default class Transaction {
  constructor(public readonly client: pg.PoolClient,
      private readonly accessExclusiveLockTables: Array<string>,
      private readonly advisoryLockKeys: Array<number>) {
  }

  public query(query: string, values?: Array<any>): Promise<pg.QueryResult> {
    return this.client.query(query, values)
  }

  public ensureHasAccessExclusiveLock(table: string) {
    if (!this.accessExclusiveLockTables.includes(table)) {
      throw new Error(`Access Exclusive lock on table '${table}' is required but missing`)
    }
  }

  public ensureHasAdvisoryLock(key: number) {
    if (!this.advisoryLockKeys.includes(key)) {
      throw new Error(`Advisory lock on key '${key}' is required but missing`)
    }
  }
}
