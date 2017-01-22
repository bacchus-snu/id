import * as pg from 'pg';
import config from '../config';

export type QueryResult = pg.QueryResult;
const pool = new pg.Pool(config.postgres);

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
 * A PostgreSQL connection which can be safely returned to the connection pool.
 * Use 'close' to release the underlying connection.
 */
export class Connection {
  protected alive: boolean;

  constructor(private client: pg.Client, private done: (err?: any) => void) {
    this.alive = true;
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
  public async commit(): Promise<{}> {
    if (this.alive) {
      await this.simpleQuery('commit');
      await this.close();
    }
    return {};
  }

  public async rollback(): Promise<{}> {
    if (this.alive) {
      await this.simpleQuery('rollback');
      await this.close();
    }
    return {};
  }

  /**
   * Acquires users_valids lock
   * All operations that may require modifying users_valids table must obtain this lock
   */
  public async lock(userId: number): Promise<TransactionWithLock> {
    await this.preparedQuery('users_valids_lock',
      'select pg_advisory_lock(user_id) from users where user_id = $1', [userId]);
    return this as TransactionWithLock;
  }
}

/**
 * A PostgreSQL transaction with users_valids lock on the specified user
 */
export class TransactionWithLock extends Transaction {
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
    throw e;
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
    throw e;
  }
}

/**
 * Do things with transaction
 */
export async function beginWithLock<T>(userId: number,
    func: (trw: TransactionWithLock) => Promise<T>): Promise<T> {
  const locked: TransactionWithLock = await doBeginWithLock(userId);
  try {
    const result: T = await func(locked);
    await locked.commit();
    return result;
  } catch (e) {
    await locked.rollback();
    throw e;
  }
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
 * Create a new TransactionWithLock
 */
function doBeginWithLock(userId: number): Promise<TransactionWithLock> {
  const promisedTransaction: Promise<TransactionWithLock> = new Promise((resolve, reject) => {
    pool.connect((error, client, done) => {
      if (error) {
        reject(error);
      } else {
        resolve(new TransactionWithLock(client, done));
      }
    });
  });
  const promisedBegin: Promise<TransactionWithLock> = promisedTransaction.then(transaction => {
    return transaction.simpleQuery('begin').then(result => Promise.resolve(transaction));
  });
  const promisedLock: Promise<TransactionWithLock> = promisedBegin.then(transaction =>
    transaction.lock(userId));
  return promisedLock;
}
