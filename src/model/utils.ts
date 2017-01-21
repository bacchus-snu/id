import * as pg from 'pg';
import config from '../config';

type QueryResult = pg.QueryResult;
const pool = new pg.Pool(config.postgres);

/**
 * A PostgreSQL connection which can be safely returned to the connection pool.
 * Use 'close' to release the underlying connection.
 */
export class Connection {
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
      this.done();
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
  public async commit(): Promise<QueryResult> {
    const result = await this.simpleQuery('commit');
    await this.close();
    return result;
  }

  public async rollback(): Promise<QueryResult> {
    const result = await this.simpleQuery('rollback');
    await this.close();
    return result;
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
 * Create a new Connection object
 */
export function connect(): Promise<Connection> {
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
export function begin(): Promise<Transaction> {
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
export function beginWithLock(userId: number): Promise<TransactionWithLock> {
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
