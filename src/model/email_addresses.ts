export interface EmailAddress {
  local: string;
  domain: string;
}

/**
 * Add new email address
 */
export async function insert(conn: Connection, userId: number, local: string, domain: string,
  verified: boolean): Promise<number> {
  throw new Error('Not implemented');
}

/**
 * Generate verify token
 */
export async function generateVerifyToken(conn: Connection, addressId: number,
  expireAfter: Date | null): Promise<string> {
  throw new Error('Not implemented');
}

/**
 * Verify
 * Use token if provided
 */
export async function verify(conn: Connection, addressId: number, token: string | null):
  Promise<boolean> {
  throw new Error('Not implemented');
}

/**
 * Remove
 * set primary email address = null if needed
 */
export async function remove(tr: Transaction, addressId: number): Promise<QueryResult> {
  throw new Error('Not implemented');
}

/**
 * Remove user's addresses
 */
export async function removeUserId(conn: Connection, userId: number): Promise<QueryResult> {
  throw new Error('Not implemented');
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
