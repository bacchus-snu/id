import * as trans from '../translations';
import { Connection, QueryResult } from './utils';

/**
 * Check hosts and reserved_usernames tables
 */
export async function isReservedUserName(conn: Connection, name: string): Promise<boolean> {
  const sel = await conn.query(`select hostname as name from hosts where hostname = $1 union
    select name from reserved_usernames where name = $1`, [name]);
  return sel.rowCount !== 0;
}

/**
 * Add one entry to reserved_usernames
 */
export async function insert(conn: Connection, name: string): Promise<QueryResult> {
  if (name === '') {
    throw trans.reservedUserNameEmpty;
  }
  try {
    const insert = await conn.query('insert into reserved_usernames (name) values ($1)', [name]);
    return insert;
  } catch (e) {
    if (e.constraint === 'reserved_usernames_pkey') {
      throw trans.userNameDuplicate(name);
    }
    throw e;
  }
}

/**
 * Delete
 */
export async function remove(conn: Connection, name: string): Promise<QueryResult> {
  if (name === '') {
    throw trans.reservedUserNameEmpty;
  }
  const result = await conn.query('delete from reserved_usernames where name = $1', [name]);
  if (result.rowCount === 0) {
    throw trans.reservedUserNameNotFound(name);
  }
  return result;
}
