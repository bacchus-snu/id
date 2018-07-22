export interface EmailAddress {
  local: string;
  domain: string;
}

/**
 * Search by email address
 */
export async function byAddress(conn: Connection, local: string, domain: string): Promise<number> {
  const select = await conn.query(`select user_id from email_addresses where address_local = $1 and
    address_domain = $2 and verified = true`, [local, domain]);
  if (select.rowCount === 0) {
    throw trans.emailAddressNotFound(local, domain);
  }
  return select.rows[0].user_id;
}

/**
 * Add email address
 * Returns verifyToken
 */
export async function requestVerification(tr: Transaction, local: string, domain: string,
  expireAfter: Date | null): Promise<string> {
  if (local === '' || domain === '') {
    throw trans.invalidEmailAddress(local, domain);
  }
  const select = await tr.query(`select user_id from email_addresses where address_local = $1 and
    address_domain = $2`, [local, domain]);
  if (select.rowCount === 0) {
    const token = await password.ramdom();
    await tr.query(`insert into email_addresses (address_local, address_domain, verify_token,
      verify_expire_after) values ($1, $2, $3, $4)`, [local, domain, token, expireAfter]);
    return token;
  } else {
    if (select.rows[0].user_id !== null) {
      throw trans.emailAddressDuplicate(local, domain);
    }
    const token = await password.ramdom();
    await tr.query(`update email_addresses set verify_token = $1, verify_expire_after = $2
      where address_local = $3 and address_domain = $4`, [token, expireAfter, local, domain]);
    return token;
  }
}

/**
 * Verify email address with the given token
 */
export async function verify(tr: Transaction, addressId: number, userId: number, token: string):
  Promise<QueryResult> {
  await test(tr, addressId, token);
  return await verified(tr, addressId, userId);
}

/**
 * Just test the token
 * Warning: this function does not discard verify_token after successful check
 */
export async function test(conn: Connection, addressId: number, token: string):
  Promise<QueryResult> {
  const select = await conn.query(`select verify_token, verify_expire_after from email_addresses
    where email_address_id = $1`, [addressId]);
  if (select.rowCount === 0) {
    throw trans.invalidEmailAddressId(addressId);
  }
  const e = select.rows[0];
  testToken(e.verify_token, e.verify_expire_after, token);
  return select;
}

/**
 * Set as verified
 */
export async function verified(conn: Connection, addressId: number, userId: number) {
  let update: QueryResult;
  try {
    update = await conn.query(`update email_addresses set user_id = $1, verify_token = null,
      verify_expire_after = null where email_address_id = $2`, [userId, addressId]);
  } catch (e) {
    if (e.constraint === 'email_addresses_user_id_fkey') {
      throw trans.invalidUserId(userId);
    }
    throw e;
  }
  if (update.rowCount === 0) {
    throw trans.invalidEmailAddressId(addressId);
  }
  return update;
}

/**
 * Check validity of address
 * Throw an error if check has failed
 */
export async function check(conn: Connection, userId: number, contactId: number):
  Promise<QueryResult> {
  // TODO: check 'verified' of email as well
  // TODO: THROW AN ERROR IF CHECK HAS FAILED
  throw new Error('Not implemented');
}
