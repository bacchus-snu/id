import * as trans from '../translations';
import * as reserved_usernames from './reserved_usernames';
import { begin, Connection, en, TransactionWithLock } from './utils';

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
  // TODO
  return null;
}

/**
 * Create a user with granted node
 * Returns userId of the created user
 */
export async function create(nodeId: number, expireAfter: Date | null,
  name: string, realname: string | null, snuidBachelor: string | null,
  snuidMaster: string | null, snuidDoctor: string | null, snuidMasterDoctor: string | null,
  shellId: number | null, timezone: string | null): Promise<number> {
  if (name.length < 3 || !/^[a-z][a-z0-9]*$/.test(name)) {
    throw trans.userNameNotAllowed(name);
  }
  const transaction = await begin();
  if (await reserved_usernames.isReservedUserName(transaction, name)) {
    throw trans.userNameDuplicate(name);
  }
  try {
    await transaction.query(
      `insert into users (name, realname, snuid_bachelor, snuid_master, snuid_doctor,
       snuid_master_doctor, shell_id, timezone, blocked)
       values ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
       [name, en(realname), en(snuidBachelor), en(snuidMaster), en(snuidDoctor),
        en(snuidMasterDoctor), shellId, en(timezone)],
    );
  } catch (e) {
    if (e.constraint === 'users_name_key') {
      throw trans.userNameDuplicate(name);
    }
    if (e.constraint === 'users_shell_id_fkey') {
      throw trans.invalidShellId(shellId);
    }
    throw e;
  }
  const userId = await nameToUserId(transaction, name);
  // Promote Transaction to TransactionWithLock
  const locked = await transaction.lock(userId);
  await grant(locked, userId, nodeId, expireAfter);
  await transaction.commit();
  return userId;
}
