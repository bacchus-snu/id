import * as trans from '../translations';
import { Connection, en, placeholders, QueryResult, TransactionWithUserLock } from './utils';

// delete (cascade)
// generateEnrollSecret
// dropEnrollSecret
// recalculate the affected

/**
 * Create a new accepted class or request for a class
 * Returns class_id
 */
export async function create(tr: Transaction, ownerId: number | null, contactId: number | null,
  expireAfter: Date | null, accepted: boolean, requestText: string | null):
  Promise<number> {

  // TODO: Check for contactId owner

  let classId: number;
  try {
    const insert = await tr.query(`insert into classes (owner_id, primary_contact_address_id,
      expire_after, accepted, request_text, enroll_auto) values ($1, $2, $3, $4, $5, false)
      returning class_id`,
      [ownerId, contactId, expireAfter, accepted, en(requestText)]);
    classId = insert.rows[0].class_id;
  } catch (e) {
    if (e.constraint === 'classes_owner_id_fkey') {
      throw trans.invalidUserId(ownerId);
    }
    if (e.constraint === 'classes_primary_contact_address_id_fkey') {
      throw trans.invalidEmailAddressId(contactId);
    }
    throw e;
  }

  if (ownerId !== null && accepted) {
    // TODO mail to owner
  }
  return classId;
}

/**
 * Drop the class (cascade)
 */
export async function remove(tr: Transaction, classId: number): Promise<QueryResult> {
  const select = await tr.query(`select owner_id, accepted from classes where class_id = $1`,
    [classId]);
  if (select.rowCount === 0) {
    throw trans.invalidClassId(classId);
  }
  const c = select.rows[0];

  // TODO delete

  if (c.accepted) {
    if (c.owner_id !== null) {
      // TODO mail to the owner
    }
    // TODO recalculation
  }
}

/**
 * Modify existing class
 */
export async function update(tr: Transaction, classId: number, ownerId: number | null,
  contactId: number | null, expireAfter: Date | null, accepted: boolean,
  requestText: string | null): Promise<QueryResult> {
  const select = await tr.query(`select owner_id, primary_contact_address_id, accepted,
    from classes where class_id = $1`, [classId]);
  if (select.rowCount === 0) {
    throw trans.invalidClassId(classId);
  }
  const c = select.rows[0];
  const recalculationNeeded = c.accepted !== accepted;
  const addressCheckNeeded = c.owner_id !== ownerId || c.primary_contact_address_id !== contactId;

  if (addressCheckNeeded) {
    // TODO: Check for contactId owner
  }

  let update: QueryResult;
  try {
    update = await tr.query(`update classes set owner_id = $1, primary_contact_address_id = $2,
      expire_after = $3, accepted = $4, request_text = $5, recalculating = $6 where class_id = $7`,
      [ownerId, contactId, expireAfter, accepted, en(requestText),
       recalculationNeeded ? true : c.recalculating, classId]);
  } catch (e) {
    if (e.constraint === 'classes_owner_id_fkey') {
      throw trans.invalidUserId(ownerId);
    }
    if (e.constraint === 'classes_primary_contact_address_id_fkey') {
      throw trans.invalidEmailAddressId(contactId);
    }
    throw e;
  }

  if (recalculationNeeded) {
    if (ownerId !== null) {
      // TODO: mail to owner
    }
    // TODO: request recalculation service
  }
  return update;
}

export async function nullOwnerId(conn: Connection, ownerId: number): Promise<QueryResult> {
  // TODO: nullify primary_contact_address_id as well
  throw new Error('Not implemented');
}
