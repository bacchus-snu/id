import config from '../config';
import * as classes from './classes';
import * as email_addresses from './email_addresses';
import * as trans from '../translations';
import * as nodes from './nodes';
import * as reserved_usernames from './reserved_usernames';
import * as users_classes from './users_classes';
import * as users_nodes from './users_nodes';
import * as users_masks from './users_masks';
import * as users_terms from './users_terms';
import * as users_valids from './users_valids';
import { Connection, en, testToken, Transaction, TransactionWithUserLock } from './utils';
import * as password from './password';

/**
 * Administrators can block a user. Blocked users
 *   - can log in to id.snucse.org, request for nodes, apply for classes, accept terms, or
 *     provide their personal information
 *   - cannot authenticate themselves to external systems via LDAP or OAuth
 */

/**
 * Interface for communicationg with api and service layer
 */

interface UserLegacy {
  contact: email_addresses.EmailAddress | null;
  name: string;
  realname: string | null;
  language: string | null;
  timezone: string | null;
}

/**
 * Operations on basic information - create and remove
 * All users must have at least one valid node.
 */

/**
 * Create a user with a granted node and basic information
 * Returns userId of the created user
 */
export async function create(tr: Transaction, addressId: number, verifyToken: string,
  nodeId: number, expireAfter: Date | null, name: string): Promise<number> {
  if (name.length < 3 || !/^[a-z][a-z0-9]*$/.test(name)) {
    throw trans.userNameNotAllowed(name);
  }
  if (await reserved_usernames.isReservedUserName(tr, name)) {
    throw trans.userNameDuplicate(name);
  }
  email_addresses.test(tr, addressId, verifyToken);
  let userId: number;
  try {
    const insert = await tr.query(`insert into users (name, blocked, is_reset_token,
      primary_email_address_id) values ($1, false, false, $2) returning user_id`,
      [name, addressId]);
    userId = insert.rows[0].user_id;
  } catch (e) {
    if (e.constraint === 'users_name_key') {
      throw trans.userNameDuplicate(name);
    }
    throw e;
  }
  email_addresses.verified(tr, addressId, userId);
  // Promote Transaction to TransactionWithUserLock
  const locked = await tr.userLock(userId);
  await users_nodes.modify(locked, userId, [{ nodeId, expireAfter }], []);
  await locked.userUnlock();
  return userId;
}

/**
 * Delete a user
 * This function is also triggere when a user loses all of its valid nodes
 */
export async function remove(tr: Transaction, userId: number): Promise<UserLegacy> {
  await users_valids.removeUserId(tr, userId);
  await users_masks.removeUserId(tr, userId);
  await users_terms.removeUserId(tr, userId);
  await users_nodes.removeUserId(tr, userId);
  await users_classes.removeUserId(tr, userId);
  await classes.nullOwnerId(tr, userId);
  // TODO apps.removeOwnerId(tr, userId);
  const contact = await getContactAddress(tr, userId);
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
 * Operations for account recovery process
 */

/**
 * Recover a user
 * By using token, grant a node to the user
 */
export async function recover(locked: TransactionWithUserLock, userId: number, nodeId: number,
  expireAfter: Date | null, password: string, token: string): Promise<QueryResult> {
  await checkToken(locked, userId, token, false);
  await users_nodes.modify(locked, userId, [{ nodeId, expireAfter }], []);
  return await updatePassword(locked, userId, password);
}

/**
 * Process account recovery request
 */
export async function requestRecovery(tr: Transaction, local: string, domain: string,
  tokenExpireAfter: Date | null): Promise<string> {
  const userId = await email_addresses.byAddress(tr, local, domain);
  const token = await generateToken(tr, userId, tokenExpireAfter, false);
  // API server now have to send token via email
  return token;
}

/**
 * Operations on token
 */

/**
 * Nullify token
 */
async function nullToken(conn: Connection, userId: number): Promise<QueryResult> {
  const update = await conn.query(`update users set reset_recovery_token = null,
    token_expire_after = null, is_reset_token = false where user_id = $1`, [userId]);
  if (update.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  return update;
}

/**
 * Generate token
 */
async function generateToken(conn: Connection, userId: number, expireAfter: Date | null,
  isResetToken: boolean): Promise<string> {
  const token = await password.random();
  const update = await conn.query(`update users set reset_recovery_token = $1,
    token_expire_after = $2, is_reset_token = $3 where user_id = $4`,
    [token, expireAfter, isResetToken, userId]);
  if (update.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  return token;
}

/**
 * Check token
 */
async function checkToken(tr: Transaction, userId: number, token: string, isResetToken: boolean):
  Promise<QueryResult> {
  const select = await locked.query(`select reset_recovery_token, token_expire_after,
    is_reset_token from users where user_id = $1`, [userId]);
  if (select.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  const u = select.rows[0];
  if (u.is_reset_token !== isResetToken) {
    throw trans.invalidToken;
  }
  testToken(u.reset_recovery_token, u.token_expire_after, token);
  await nullToken(locked, userId);
  return select;
}

/**
 * Operations on UID
 */

/**
 * Get UID. Generate UID if needed
 */
export async function getUid(tr: Transaction, userId: number): Promise<number> {
  const select = await tr.query(`select uid from users where user_id = $1`, [userId]);
  if (select.rows[0].uid !== null) {
    return select.rows[0].uid;
  }
  const gen = await tr.simpleQuery(`select b.uid + 1 as uid from users as a right outer join
    users as b on a.uid = b.uid + 1 where a.uid is null order by b.uid limit 1`);
  const uid = gen.rowCount === 0 ? config.ldap.minUid : gen.rows[0].uid;
  const update = await tr.query(`update users set uid = $1 where user_id = $2`, [uid, userId]);
  return uid;
}

/**
 * Operations on personally identifiable information
 */

/**
 * Get PIIs
 */
export async function getPIIs(conn: Connection, userId: number): Promise<PIIs> {
  const select = await conn.query(`select realname, snuid_bachelor, snuid_master, snuid_doctor,
    snuid_master_doctor from users where user_id = $1`, [userId]);
  if (select.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  const u = select.rows[0];
  return {
    realname: u.realname,
    snuidBachelor: u.snuid_bachelor,
    snuidMaster: u.snuid_master,
    snuidDoctor: u.snuid_doctor,
    snuidMasterDoctor: u.snuid_master_doctor,
  };
}

/**
 * Update user PIIs
 */
export async function updatePIIs(tr: Transaction, userId: number, piis: PIIs):
  Promise<QueryResult> {
  await users_valids.checkNotGhost(tr, userId);

  // get list of piis that should be immutable
  const granted = users_nodes.select(tr, userId);
  const immutable: Set<string> = new Set();
  for (let node of granted) {
    for (let pii of node.requiredPIIs.users) {
      immutable.add(pii);
    }
  }

  const select = await tr.query(`select realname, snuid_bachelor, snuid_master, snuid_doctor,
    snuid_master_doctor from users where user_id = $1`, [userId]);
  if (select.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  const u = select.rows[0];

  checkMutability(immutable, 'realname', u.realname === en(piis.realname));
  checkMutability(immutable, 'snuid_bachelor', u.snuid_bachelor === en(piis.snuidBachelor));
  checkMutability(immutable, 'snuid_master', u.snuid_master === en(piis.snuidMaster));
  checkMutability(immutable, 'snuid_doctor', u.snuid_doctor === en(piis.snuidDoctor));
  checkMutability(immutable, 'snuid_master_doctor',
    u.snuid_master_doctor === en(piis.snuidMasterDoctor));

  return await conn.query(`update users set realname = $1, snuid_bachelor = $2,
    snuid_master = $3, snuid_doctor = $4, snuid_master_doctor = $5 where user_id = $6`,
    [en(realname), en(piis.snuidBachelor), en(piis.snuidMaster), en(piis.snuidDoctor),
    en(piis.snuidMasterDoctor), userId]);
}

function checkMutability(immutable: Set<string>, pii: string, equals: boolean) {
  if (immutable.has(pii) && !equals) {
    throw trans.immutablePII(pii);
  }
}

/**
 * Drop all personal informations
 */
export async function removePIIsAndPassword(tr: Transaction, userId: number): Promise<UserLegacy> {
  const select = await conn.query(`select name, realname, language, timezone from users
    where user_id = $1`, [userId]);
  if (select.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  const u = select.rows[0];
  await conn.query(`update users set password_digest = null, realname = null, snuid_bachelor = null,
    snuid_master = null, snuid_doctor = null, snuid_master_doctor = null where user_id = $1`,
    [userId]);
  const contact = await getContactAddress(tr, userId);
  return {
    contact,
    name: u.name,
    realname: u.realname,
    language: u.language,
    timezone: u.timezone,
  };
}

/**
 * Operations on password
 */

/**
 * Check password
 */
export async function checkPassword(conn: Connection, userId: number, password: string):
  Promise<boolean> {
  throw new Error('Not implemented');
}

/**
 * Update password
 */
export async function updatePassword(tr: Transaction, userId: number, input: string):
  Promise<QueryResult> {
  await users_valids.checkNotGhost(tr, userId);
  throw new Error('Not implemented');
}

/**
 * Check and use password reset token
 */
export async function reset(tr: Transaction, userId: number, token: string, password: string):
  Promise<QueryResult> {
  await checkToken(tr, userId, token, true);
  return await updatePassword(tr, userId, password);
}

/**
 * Request reset
 */
export async function requestReset(tr: Transaction, local: string, domain: string,
  tokenExpireAfter: Date | null): Promise<string> {
  const userId = await email_addresses.byAddress(tr, local, domain);
  const token = await generateToken(tr, userId, tokenExpireAfter, true);
  // API server now have to send token via email
  return token;
}

/**
 * Block/unblock
 */
export async function block(conn: Connection, userId: number, block: boolean,
  expireAfter: Date | null): Promise<QueryResult> {
  const update = await conn.query(`update users set block = $1, blocked_expire_after = $2
    where user_id = $3`, [block, expireAfter, userId]);
  if (update.rowCount === 0) {
    throw trans.invalidUserId(userId);
  }
  return update;
}

/**
 * Set specific shellId to null
 */
export function nullShellId(conn: Connection, shellId: number): Promise<QueryResult> {
  return conn.query('update users set shell_id = null where shell_id = $1 returning user_id',
    [shellId]);
}

/**
 * update primary contact id
 */
export async function updateContactId(tr: Transaction, userId: number, contactId: number):
  Promise<QueryResult> {
  await email_addresses.check(tr, userId, contactId);
  return await tr.query('update users set primary_email_address_id = $1 where user_id = $2',
    [contactId, userId]);
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
