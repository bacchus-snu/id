import * as classes from './classes';
import * as email_addresses from './email_addresses';
import * as trans from '../translations';
import * as reserved_usernames from './reserved_usernames';
import * as users_classes from './users_classes';
import * as users_nodes from './users_nodes';
import * as users_masks from './users_masks';
import * as users_terms from './users_terms';
import * as users_valids from './users_valids';
import { Connection, en, Transaction } from './utils';

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
 * Create a user with granted node
 * Returns userId of the created user
 */
export async function create(transaction: Transaction, nodeId: number, expireAfter: Date | null,
  name: string, realname: string | null, snuidBachelor: string | null,
  snuidMaster: string | null, snuidDoctor: string | null, snuidMasterDoctor: string | null,
  shellId: number | null, language: string | null, timezone: string | null): Promise<number> {
  if (name.length < 3 || !/^[a-z][a-z0-9]*$/.test(name)) {
    throw trans.userNameNotAllowed(name);
  }
  if (await reserved_usernames.isReservedUserName(transaction, name)) {
    throw trans.userNameDuplicate(name);
  }
  let userId: number;
  try {
    const insert = await transaction.query(
      `insert into users (name, realname, snuid_bachelor, snuid_master, snuid_doctor,
       snuid_master_doctor, shell_id, language, timezone, blocked)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, false) returning user_id`,
       [name, en(realname), en(snuidBachelor), en(snuidMaster), en(snuidDoctor),
       en(snuidMasterDoctor), shellId, en(language), en(timezone)],
    );
    userId = insert.rows[0].user_id;
  } catch (e) {
    if (e.constraint === 'users_name_key') {
      throw trans.userNameDuplicate(name);
    }
    if (e.constraint === 'users_shell_id_fkey') {
      throw trans.invalidShellId(shellId);
    }
    throw e;
  }
  // Promote Transaction to TransactionWithLock
  const locked = await transaction.userLock(userId);
  await users_nodes.modify(locked, userId, [{ nodeId, expireAfter }], []);
  return userId;
}

/**
 * Update user details
 */
export async function update(conn: Connection, userId: number, realname: string | null,
  snuidBachelor: string | null, snuidMaster: string | null, snuidDoctor: string | null,
  snuidMasterDoctor: string | null, shellId: number | null, language: string | null,
  timezone: string | null): Promise<QueryResult> {
  let update: QueryResult;
  try {
    update = await conn.query(`update users set realname = $1, snuid_bachelor = $2,
      snuid_master = $3, snuid_doctor = $4, snuid_master_doctor = $5, shell_id = $6, language = $7,
      timezone = $8 where userId = $9`, [en(realname), en(snuidBachelor), en(snuidMaster),
      en(snuidDoctor), en(snuidMasterDoctor), shellId, en(language), en(timezone), userId]);
  } catch (e) {
    if (e.constraint === 'users_shell_id_fkey') {
      throw trans.invalidShellId(shellId);
    }
    throw e;
  }
  if (update.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  return update;
}

interface UserLegacy {
  contact: email_addresses.EmailAddress | null;
  name: string;
  realname: string | null;
  language: string | null;
  timezone: string | null;
}

/**
 * Delete a user
 */
export async function remove(tr: Transaction, userId: number): Promise<UserLegacy> {
  const contact = await getContactAddress(tr, userId);
  await users_valids.removeUserId(tr, userId);
  await users_masks.removeUserId(tr, userId);
  await users_terms.removeUserId(tr, userId);
  await users_nodes.removeUserId(tr, userId);
  await users_classes.removeUserId(tr, userId);
  await classes.nullOwnerId(tr, userId);
  // TODO apps.nullOwnerId(tr, userId);
  await email_addresses.removeUserId(tr, userId);
  const remove = await tr.query(`delete from users where user_id = $1 returning name, realname,
    language, timezone`, [userId]);
  if (remove.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  const u = remove.rows[0];
  return {
    contact,
    name: u.name,
    realname: u.realname,
    language: u.language,
    timezone: u.timezone,
  };
}

/**
 * Drop all personal informations
 */
export async function purgeInformation(tr: Transaction, userId: number): Promise<QueryResult> {
  const select = await conn.query(`select name, realname, language, timezone from users
    where user_id = $1`, [userId]);
  if (select.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  const u = select.rows[0];
  await conn.query(`update users set password_digest = null, realname = null, snuid_bachelor = null,
    snuid_master = null, snuid_doctor = null, snuid_master_doctor = null, reset_token = null,
    reset_token_expire_after = null where user_id = $1`, [userId]);
  const contact = getContactAddress(tr, userId);
  return {
    contact,
    name: u.name,
    realname: u.realname,
    language: u.language,
    timezone: u.timezone,
  };
}

/**
 * Get primary contact address
 */
async function getContactAddress(conn: Connection, userId: number):
  Promise<email_addresses.EmailAddress | null> {
  const select = await conn.query(`select address_local, address_domain from users, email_addresses
    where users.user_id = $1 and users_user.id = email_addresses.user_id and
    primary_email_address_id = email_address_id and verified = true`, [userId]);
  if (select.rowCount === 0) {
    return null;
  }
  return {
    // TODO: check needed. select.rows[0].address_local ?
    local: select.rows[0].address_local,
    domain: select.rows[0].address_domain,
  };
}

/**
 * Check password
 */
export async checkLogin(conn: Connection, name: string, password: string): Promise<boolean> {
  throw new Error('Not implemented');
}

/**
 * Update password
 */
export async updatePassword(conn: Connection, userId: number, input: string): Promise<QueryResult> {
  throw new Error('Not implemented');
}

/**
 * Block/unblock
 */
export async block(conn: Connection, userId: number, block: boolean, expireAfter: Date | null):
  Promise<QueryResult> {
  const update = await conn.query(`update users set block = $1, expire_after = $2
    where user_id = $3`, [block, expireAfter, userId]);
  if (update.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  return update;
}

/**
 * Generate password reset token
 */
export async generateResetToken(conn: Connection, userId: number, expireAfter: Date | null):
  Promise<string> {
  throw new Error('Not implemented');
}

/**
 * Check and use password reset token
 */
export async useResetToken(tr: Transaction, userId: number, inputToken: string, password: string):
  Promise<boolean> {
  // TODO check reset_expire_after
  // TODO drop token if token is correct
  throw new Error('Not implemented');
}

/**
 * Get UID. Generate UID if needed
 */
export async getUid(tr: Transaction, userId: number): Promise<number> {
  throw new Error('Not implemented');
}

/**
 * Set specific shellId to null
 */
export nullShellId(conn: Connection, shellId: number): Promise<QueryResult> {
  return conn.query('update users set shell_id = null where shell_id = $1 returning user_id',
    [shellId]);
}

/**
 * update primary contact id
 */
export async updateContactId(tr: Transaction, userId: number, contactId: number):
  Promise<QueryResult> {
  await email_addresses.check(tr, userId, contactId);
  return await tr.query('update users set primary_email_address_id = $1 where user_id = $2',
    [contactId, userId]);
}
