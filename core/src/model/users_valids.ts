import { account } from '../nodes';

export async function removeUserId(conn: Connection, userId: number): Promise<QueryResult> {
  throw new Error('Not implemented');
}

/**
 * Applied domain rule: a user with valid 'account' node is a ghost
 * Warning: this function does not check the validity of userId
 */
export async function checkNotGhost(conn: Connection, userId: number): Promise<QueryResult> {
  const select = await conn.query(`select count(*) from users_valids where user_id = $1
    and node_id = $2`, [userId, account.nodeId]);
  if (select.rows[0].count === 0) {
    throw trans.ghostUser(userId, account);
  }
  return select;
}
