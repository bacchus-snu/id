import * as pg from 'pg';
import config from '../config';
import { wrapError } from '../log/exception';

export type QueryResult = pg.QueryResult;
const poolConfig = config.postgres;
if (poolConfig.parseInputDatesAsUTC === false) {
  throw new Error('parseInputDatesAsUTC must be true');
}
poolConfig.parseInputDatesAsUTC = true;
const pool = new pg.Pool(config.postgres);

/**
 * A PostgreSQL connection which can be safely returned to the connection pool.
 * Use 'close' to release the underlying connection.
 */
export class Connection {
  protected alive: boolean = true;

  constructor(private client: pg.Client, private done: (err?: any) => void) {
  }

  public simpleQuery(text: string): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.client.query(text, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  public query(text: string, values: Array<any>): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.client.query(text, values, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  public preparedQuery(name: string, text: string, values: Array<any>): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.client.query({ name, text, values }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  public close(): Promise<{}> {
    return new Promise((resolve, reject) => {
      if (this.alive) {
        this.done();
        this.alive = false;
      }
      resolve();
    });
  }
}

/**
 * A PostgreSQL transaction based on a connection which can be safely returned
 * to the connection pool.
 * Use 'commit' or 'rollback' to release the underlying connection.
 */
export class Transaction extends Connection {
  private user: number | null = null;

  public async commit(): Promise<{}> {
    if (!this.alive) {
      return {};
    }
    await this.simpleQuery('commit');
    if (this.user !== null) {
      this.userUnlock();
    }
    await this.close();
    return {};
  }

  public async rollback(): Promise<{}> {
    if (!this.alive) {
      return {};
    }
    await this.simpleQuery('rollback');
    if (this.user !== null) {
      this.userUnlock();
    }
    await this.close();
    return {};
  }

  /**
   * Acquires users_valids lock
   * All operations that may require modifying users_valids table must obtain this lock
   * Warning: this function does not check the validity of userId
   */
  public async userLock(userId: number): Promise<TransactionWithUserLock> {
    if (this.user !== null) {
      throw new Error('Already locked : ' + this.user);
    }
    this.user = userId;
    await this.preparedQuery('users_valids_lock', 'select pg_advisory_lock($1)', [userId]);
    return this as TransactionWithUserLock;
  }

  /**
   * Release users_valids lock
   */
  public async userUnlock(): Promise<Transaction> {
    if (this.user === null) {
      throw new Error('Not locked');
    }
    await this.preparedQuery('users_valids_unlock', 'select pg_advisory_unlock($1)', [this.user]);
    this.user = null;
    return this;
  }

  /**
   * Acquires service lock
   * Service lock is held until commit/rollback
   */
  public async serviceLock(serviceId: number): Promise<QueryResult> {
    return await this.query('select pg_advisory_xact_lock(1, $1)', [serviceId]);
  }
}

/**
 * A PostgreSQL transaction with users_valids lock on the specified user
 */
export class TransactionWithUserLock extends Transaction {
}

/**
 * Create a new Connection object
 */
function doConnect(): Promise<Connection> {
  return new Promise((resolve, reject) => {
    pool.connect((error, client, done) => {
      if (error) {
        reject(error);
      } else {
        resolve(new Connection(client, done));
      }
    });
  });
}

/**
 * Create a new Transaction object
 */
function doBegin(): Promise<Transaction> {
  const promisedTransaction: Promise<Transaction> = new Promise((resolve, reject) => {
    pool.connect((error, client, done) => {
      if (error) {
        reject(error);
      } else {
        resolve(new Transaction(client, done));
      }
    });
  });
  const promisedBegin: Promise<Transaction> = promisedTransaction.then(transaction => {
    return transaction.simpleQuery('begin').then(result => Promise.resolve(transaction));
  });
  return promisedBegin;
}

/**
 * Create a new TransactionWithUserLock
 */
function dobeginWithUserLock(userId: number): Promise<TransactionWithUserLock> {
  const promisedBegin = doBegin();
  const promisedLock = promisedBegin.then(transaction => transaction.userLock(userId));
  return promisedLock;
}

/**
 * Do things with connection
 */
export async function connect<T>(func: (conn: Connection) => Promise<T>): Promise<T> {
  const connection: Connection = await doConnect();
  try {
    const result: T = await func(connection);
    await connection.close();
    return result;
  } catch (e) {
    await connection.close();
    throw wrapError(e);
  }
}

/**
 * Do things with transaction
 */
export async function begin<T>(func: (tr: Transaction) => Promise<T>): Promise<T> {
  const transaction: Transaction = await doBegin();
  try {
    const result: T = await func(transaction);
    await transaction.commit();
    return result;
  } catch (e) {
    await transaction.rollback();
    throw wrapError(e);
  }
}

/**
 * Do things with transaction with lock
 */
async function beginWithUserLock<T>(userId: number,
  func: (trw: TransactionWithUserLock) => Promise<T>): Promise<T> {
  const locked: TransactionWithUserLock = await dobeginWithUserLock(userId);
  try {
    const result: T = await func(locked);
    await locked.commit();
    return result;
  } catch (e) {
    await locked.rollback();
    throw wrapError(e);
  }
}

/**
 * A mapping with an userId and the corresponding Promises.
 * Each element is the last routine of the queue.
 */
const queues: Array<Promise<any>> = [];

/**
 * Arrange beginWithUserLocks with same userId in queue
 * This is important since multiple outstanding lock requests on same userId may lead to
 * connection pool exhaustion.
 */
export function queue<T>(userId: number, func: (trw: TransactionWithUserLock) => Promise<T>):
  Promise<T> {
  let kernel: Promise<T>;
  if (queues[userId] === undefined) {
    // no other routine is in queue
    kernel = beginWithUserLock(userId, func);
  } else {
    // Promise 'queues[userId]' is right in front of me
    const kernelContinuation = _ => beginWithUserLock(userId, func);
    kernel = queues[userId].then(kernelContinuation, kernelContinuation);
  }
  // now I'm the last one in the queue
  queues[userId] = kernel;
  // delete promise from queues if no other routine is behind me
  const purgeContinuation = _ => {
    if (queues[userId] === kernel) {
      queues.splice(userId, 1);
    }
  };
  kernel.then(purgeContinuation, purgeContinuation);
  return kernel;
}

/**
 * Set difference
 */
export function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter(x => !b.has(x)));
}

/**
 * Translate [a, b, c] into '($i, $(i+1), $(i+2), ...)'
 */
export function placeholders(i: number, length: number): string {
  const idx: Array<string> = [...Array(length).keys()].map(x => '\$' + (x + i));
  return '(' + idx.join(',') + ')';
}

/**
 * Makes 'e'mtpy string 'n'ull
 */
export function en(text: string | null): string | null {
  if (text === '') {
    return null;
  }
  return text;
}

/**
 * Compare token
 */
export function testToken(storedToken: string, storedExpire: Date | null, inputToken: string):
  void {
  if (storedExpire !== null && storedExpire < new Date()) {
    throw trans.invalidToken;
  }
  if (storedToken !== inputToken) {
    throw trans.invalidToken;
  }
}
