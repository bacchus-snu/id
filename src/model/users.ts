import * as trans from '../translations';
import { begin, Connection, TransactionWithLock } from './utils';

/**
 * 1. Blocking a user
 * Administrators can block a user. Blocked users
 *   - can log in to id.snucse.org, request for nodes, apply for classes, accept terms, or
 *     provide their personal information
 *   - cannot authenticate themselves to external systems via LDAP or OAuth
 *
 * 2. Primary email address
 * All active users must provide at least one verified email address.
 * Users without email addresses provided cannot authenticate themselves to external systems
 * like blocked users
 */

/**
 * Convert name to userId
 */
async function nameToUserId(connection: Connection, name: string): Promise<number> {
  const select = await connection.query('select user_id from users where name = $1', [name]);
  if (select.rowCount === 0) {
    throw new Error('No user with name \'' + name + '\'');
  }
  return select.rows[0].user_id;
}

/**
 * Grant a node to a user
 */
async function grant(locked: TransactionWithLock, userId: number, nodeId: number,
    expireAfter: Date | null): Promise<null> {
  return null;
}

/**
 * Create a user with granted node
 * Returns userId of the created user
 */
export async function createUser(nodeId: number, expireAfter: Date | null,
  name: string, realname: string | null, snuidBachelor: number | null,
  snuidMaster: number | null, snuidDoctor: number | null, snuidMasterDoctor: number | null,
  shellId: number | null, timezone: string | null): Promise<number> {
  if (name.length < 3 || !/^[a-z][a-z0-9]*$/.test(name)) {
    throw trans.userNameNotAllowed(name);
  }
  if (realname === '') {
    throw trans.userRealnameEmpty;
  }
  const transaction = await begin();
  await transaction.query(
    `insert into users (name, realname, snuid_bachelor, snuid_master, snuid_doctor,
     snuid_master_doctor, shell_id, timezone, blocked)
     values ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
     [name, realname, snuidBachelor, snuidMaster, snuidDoctor, snuidMasterDoctor, shellId,
     timezone],
  );
  const userId = await nameToUserId(transaction, name);
  // Promote Transaction to TransactionWithLock
  await transaction.lock(userId);
  const locked = transaction as TransactionWithLock;
  await grant(locked, userId, nodeId, expireAfter);
  await transaction.commit();
  return userId;
}
