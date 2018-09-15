import * as pg from 'pg'

export default class Transaction {
  private readonly ensuredAccessExclusiveLockTables: Set<string> = new Set()
  private readonly ensuredAdvisoryLockKeys: Set<number> = new Set()
  private terminated = false

  constructor(public readonly client: pg.PoolClient,
      private readonly accessExclusiveLockTables: Array<string>,
      private readonly advisoryLockKeys: Array<number>) {
  }

  public query(query: string, values?: Array<any>): Promise<pg.QueryResult> {
    this.ensureNotTerminated()
    return this.client.query(query, values)
  }

  public ensureHasAccessExclusiveLock(table: string) {
    this.ensureNotTerminated()
    if (!this.accessExclusiveLockTables.includes(table)) {
      throw new Error(`Access Exclusive lock on table '${table}' is required but missing`)
    }
    this.ensuredAccessExclusiveLockTables.add(table)
  }

  public ensureHasAdvisoryLock(key: number) {
    this.ensureNotTerminated()
    if (!this.advisoryLockKeys.includes(key)) {
      throw new Error(`Advisory lock on key ${key} is required but missing`)
    }
    this.ensuredAdvisoryLockKeys.add(key)
  }

  public terminate() {
    this.ensureNotTerminated()
    this.terminated = true
    for (const table of this.accessExclusiveLockTables) {
      if (!this.ensuredAccessExclusiveLockTables.has(table)) {
        throw new Error(`Unnecessary lock declaration for table '${table}'`)
      }
    }
    for (const key of this.advisoryLockKeys) {
      if (!this.ensuredAdvisoryLockKeys.has(key)) {
        throw new Error(`Unnecessary lock declaration for key ${key}`)
      }
    }
  }

  private ensureNotTerminated(): void {
    if (this.terminated) {
      throw new Error('Transaction terminated')
    }
  }
}
