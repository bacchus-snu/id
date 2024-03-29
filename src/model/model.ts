import * as Bunyan from 'bunyan';
import pg from 'pg';
import type Config from '../config.js';
import EmailAddresses from './email_addresses.js';
import { ControllableError } from './errors.js';
import Groups from './groups.js';
import Hosts from './hosts.js';
import OAuth from './oauth.js';
import Permissions from './permissions.js';
import Shells from './shells.js';
import Transaction from './transaction.js';
import Users from './users.js';

const PSQL_SERIALIZATION_FAILURE = '40001';
const PSQL_DEADLOCK_DETECTED = '40P01';

export default class Model {
  private static readonly MAX_TRANSACTION_RETRY: number = 10;

  public readonly users: Users;
  public readonly emailAddresses: EmailAddresses;
  public readonly groups: Groups;
  public readonly permissions: Permissions;
  public readonly shells: Shells;
  public readonly hosts: Hosts;
  public readonly oauth: OAuth;

  private readonly pgConfig: pg.PoolConfig;
  private readonly pgPool: pg.Pool;

  constructor(public readonly config: Config, public readonly log: Bunyan) {
    this.pgConfig = config.postgresql;
    this.pgPool = new pg.Pool(this.pgConfig);

    this.users = new Users(this);
    this.emailAddresses = new EmailAddresses();
    this.groups = new Groups();
    this.permissions = new Permissions(this);
    this.shells = new Shells();
    this.hosts = new Hosts(this);
    this.oauth = new OAuth();
  }

  /**
   * Execute queires in a new transaction.
   * @param query lambda that executes queries
   * @param accessExclusiveLockTables tables that require stronger isolation than 'read committed' model
   * @param advisoryLockKeys keys for acquiring advisory locks before executing queries
   */
  public async pgDo<T>(
    query: (transaction: Transaction) => Promise<T>,
    accessExclusiveLockTables?: Array<string>,
    advisoryLockKeys?: Array<number>,
  ): Promise<T> {
    const client = await this.pgPool.connect();
    const lockTables = accessExclusiveLockTables ? accessExclusiveLockTables.sort() : [];
    const lockKeys = advisoryLockKeys ? advisoryLockKeys.sort() : [];
    const transaction = new Transaction(client, lockTables, lockKeys);
    let retryCount = 0;

    try {
      while (true) {
        try {
          await client.query('BEGIN');
          for (const key of lockKeys) {
            await client.query('SELECT pg_advisory_xact_lock($1)', [key]);
          }
          for (const table of lockTables) {
            await client.query(`LOCK TABLE ${table} IN ACCESS EXCLUSIVE MODE`);
          }
          const result = await query(transaction);
          transaction.terminate();
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');

          if (e instanceof pg.DatabaseError) {
            if (e.code === PSQL_SERIALIZATION_FAILURE || e.code === PSQL_DEADLOCK_DETECTED) {
              retryCount++;
              if (retryCount < Model.MAX_TRANSACTION_RETRY) {
                continue;
              }
            }
            throw e;
          }

          if (!(e instanceof ControllableError)) {
            // Controllable errors are properly handled by API implementations.
            this.log.error(e);
          }

          throw e;
        }
      }
    } finally {
      client.release();
    }
  }
}
