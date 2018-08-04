import * as pg from 'pg'
import Users from './users'
import EmailAddresses from './email_addresses'
import * as Bunyan from 'bunyan'

export default class Model {
  public readonly users: Users
  public readonly emailAddresses: EmailAddresses

  private readonly pgConfig: pg.PoolConfig
  private readonly pgPool: pg.Pool

  constructor(postgresConfig: pg.PoolConfig, public readonly log: Bunyan) {
    this.pgConfig = postgresConfig
    this.pgPool = new pg.Pool(this.pgConfig)

    this.users = new Users()
    this.emailAddresses = new EmailAddresses()
  }

  public async pgDo<T>(query: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pgPool.connect()
    try {
      await client.query('BEGIN')
      const result = await query(client)
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK')
      this.log.error(e)
      throw e
    } finally {
      client.release()
    }
  }
}
