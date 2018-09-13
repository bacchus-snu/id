import * as pg from 'pg'
import Users from './users'
import EmailAddresses from './email_addresses'
import Groups from './groups'
import Permissions from './permissions'
import Shells from './shells'
import * as Bunyan from 'bunyan'
import { ControllableError } from './errors'
import Config from '../config'
import * as AsyncLock from 'async-lock'

export default class Model {
  public readonly users: Users
  public readonly emailAddresses: EmailAddresses
  public readonly groups: Groups
  public readonly permissions: Permissions
  public readonly shells: Shells

  // todo: use enum for this? (to prevent key duplicates)
  public readonly KEYS = {
    USER_CREATION: 'USER_CREATION',
  }

  private readonly pgConfig: pg.PoolConfig
  private readonly pgPool: pg.Pool
  private readonly asyncLock: AsyncLock

  constructor(public readonly config: Config, public readonly log: Bunyan) {
    this.pgConfig = config.postgresql
    this.pgPool = new pg.Pool(this.pgConfig)
    this.asyncLock = new AsyncLock()

    this.users = new Users(this)
    this.emailAddresses = new EmailAddresses(this)
    this.groups = new Groups(this)
    this.permissions = new Permissions(this)
    this.shells = new Shells(this)
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
      if (!(e instanceof ControllableError)) {
        // Controllable errors are properly handled by API implementations.
        this.log.error(e)
      }
      throw e
    } finally {
      client.release()
    }
  }

  public async pgDoWithLock<T>(keys: string | Array<string>,
      query: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    return this.asyncLock.acquire(keys, async () => await this.pgDo(query))
  }
}
