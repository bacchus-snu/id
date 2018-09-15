import * as pg from 'pg'
import Users from './users'
import EmailAddresses from './email_addresses'
import Groups from './groups'
import Permissions from './permissions'
import Shells from './shells'
import * as Bunyan from 'bunyan'
import { ControllableError } from './errors'
import Config from '../config'
import Transaction from './transaction'

export default class Model {
  public readonly users: Users
  public readonly emailAddresses: EmailAddresses
  public readonly groups: Groups
  public readonly permissions: Permissions
  public readonly shells: Shells

  private readonly pgConfig: pg.PoolConfig
  private readonly pgPool: pg.Pool

  constructor(public readonly config: Config, public readonly log: Bunyan) {
    this.pgConfig = config.postgresql
    this.pgPool = new pg.Pool(this.pgConfig)

    this.users = new Users(this)
    this.emailAddresses = new EmailAddresses(this)
    this.groups = new Groups(this)
    this.permissions = new Permissions(this)
    this.shells = new Shells(this)
  }

  /**
   * Execute queires in a new transaction.
   * @param query lambda that executes queries
   * @param accessExclusiveLockTables tables that require stronger isolation than 'read committed' model
   * @param advisoryLockKeys keys for acquiring advisory locks before executing queries
   */
  public async pgDo<T>(query: (client: pg.PoolClient) => Promise<T>,
      accessExclusiveLockTables?: Array<string>, advisoryLockKeys?: Array<number>): Promise<T> {
    const client = await this.pgPool.connect()
    const lockTables = accessExclusiveLockTables ? accessExclusiveLockTables.sort() : []
    const lockKeys = advisoryLockKeys ? advisoryLockKeys.sort() : []
    const transaction = new Transaction(client, lockTables, lockKeys)
    try {
      await client.query('BEGIN')
      for (const key of lockKeys) {
        await client.query('SELECT pg_advisory_xact_lock($1)', [key])
      }
      for (const table of lockTables) {
        await client.query('LOCK TABLE $1 IN ACCESS EXCLUSIVE MODE', [table])
      }
      const result = await query(client)
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK')
      if (!(e instanceof ControllableError)) {
        // Controllable errors are properly handled by API implementations.
        this.log.error(e)
      }
      throw e
    } finally {
      client.release()
    }
  }
}
