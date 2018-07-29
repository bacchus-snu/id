import * as pg from 'pg'
import Users from './users'

export default class Model {
  public readonly users: Users
  private readonly pgConfig: pg.PoolConfig
  private pgClientInternal: pg.PoolClient | null
  private pgPool: pg.Pool | null

  public get pgClient(): pg.PoolClient {
    if (this.pgClientInternal === null) {
      throw new Error('Transaction not ready')
    } else {
      return this.pgClientInternal
    }
  }

  constructor(postgresConfig: pg.PoolConfig) {
    this.pgConfig = postgresConfig
    this.pgPool = null
    this.pgClientInternal = null

    this.users = new Users(this)
  }

  public async pgDo<T>(query: () => Promise<T>): Promise<T> {
    if (this.pgPool === null) {
      try {
        this.pgPool = new pg.Pool(this.pgConfig)
      } catch (e) {
        throw e
      }
    }
    this.pgClientInternal = await this.pgPool.connect()
    try {
      await this.pgClientInternal.query('BEGIN')
      const result = await query()
      await this.pgClientInternal.query('COMMIT')
      return result
    } catch (e) {
      await this.pgClientInternal.query('ROLLBACK')
      throw e
    } finally {
      this.pgClientInternal.release()
      this.pgClientInternal = null
    }
  }
}
