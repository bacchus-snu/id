import { begin, Transaction } from './utils';

interface User {
  userId?: number;
  name?: string;
  passwordDigest?: Buffer | null;
  blocked?: boolean;
  blockedExpireAfter?: Date | null;
  realname?: string | null;
  snuidBachelor?: string | null;
  snuidMaster?: string | null;
  snuidDoctor?: string | null;
  resetToken?: string | null;
  resetExpireAfter?: Date | null;
  uid?: number | null;
  shellId?: number | null;
  timezone?: string | null;
  primaryEmailAddressId?: number | null;
}

/**
 * Create a transaction object with users_closure lock on the specified user
 */
async function beginWithUserLock(userId: number): Promise<Transaction> {
  const transaction: Transaction = await begin();
  await transaction.query('SELECT pg_advisory_lock(userId) from users where userId = $1', [userId]);
  return transaction;
}
