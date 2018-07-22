import { Connection, QueryResult, Transaction } from './utils';

/**
 * Insert
 */
export async function insert(conn: Connection, shell: string): Promise<number> {
  throw new Error('Not implemented');
}

/**
 * Remove (cascade)
 */
export async function remove(tr: Transaction, shellId: number): Promise<QueryResult> {
  // Set shellId = null for users
  throw new Error('Not implemented');
}
