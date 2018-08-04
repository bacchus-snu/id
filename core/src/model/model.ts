import * as pg from 'pg'
import Users from './users'
import EmailAddresses from './email_addresses'
import * as Bunyan from 'bunyan'

export default class Model {
  public readonly users: Users
  public readonly emailAddresses: EmailAddresses

  private readonly pgConfig: pg.PoolConfig
  private _pgClient: pg.PoolClient | null
  private pgPool: pg.Pool | null

  public get pgClient(): pg.PoolClient {
    if (this._pgClient === null) {
      throw new Error('Transaction not ready')
    } else {
      return this._pgClient
    }
  }

  constructor(postgresConfig: pg.PoolConfig, public readonly log: Bunyan) {
    this.pgConfig = postgresConfig
    this.pgPool = null
    this._pgClient = null

    this.users = new Users(this)
    this.emailAddresses = new EmailAddresses(this)
  }

  public async pgDo<T>(query: () => Promise<T>): Promise<T> {
    if (this.pgPool === null) {
      try {
        this.pgPool = new pg.Pool(this.pgConfig)
      } catch (e) {
        throw e
      }
    }
    this._pgClient = await this.pgPool.connect()
    try {
      await this._pgClient.query('BEGIN')
      const result = await query()
      await this._pgClient.query('COMMIT')
      return result
    } catch (e) {
      await this._pgClient.query('ROLLBACK')
      throw e
    } finally {
      this._pgClient.release()
      this._pgClient = null
    }
  }
}
