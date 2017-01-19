import * as pg from 'pg';
import config from '../config';

type QueryResult = pg.QueryResult;
const pool = new pg.Pool(config.postgres);

/**
 * A PostgreSQL transaction based on a connection which can be safely returned
 * to the connection pool.
 * Use 'commit' or 'rollback' to release the underlying connection.
 */
class Transaction {
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

  public commit(): Promise<QueryResult> {
    return this.close('COMMIT');
  }

  public rollback(): Promise<QueryResult> {
    return this.close('ROLLBACK');
  }

  private close(query: string): Promise<QueryResult> {
    const promisedResult = this.simpleQuery(query);
    const promisedDone = promisedResult.then(result => {
      this.done();
      return Promise.resolve(result);
    });
    return promisedDone;
  }
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
