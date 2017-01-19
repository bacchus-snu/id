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
    const result = await this.simpleQuery('COMMIT');
    await this.close();
    return result;
  }

  public async rollback(): Promise<QueryResult> {
    const result = await this.simpleQuery('ROLLBACK');
    await this.close();
    return result;
  }
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
    return transaction.simpleQuery('BEGIN').then(result => Promise.resolve(transaction));
  });
  return promisedBegin;
}
