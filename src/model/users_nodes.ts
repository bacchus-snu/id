import * as trans from '../translations';
import * as nodes from './nodes';
import { QueryResult, TransactionWithLock } from './utils';

/**
 * Grant a node for a user
 */
export async function grant(locked: TransactionWithLock, userId: number, nodeId: number,
  expireAfter: Date | null): Promise<QueryResult> {
  try {
    nodes.getById(nodeId);
  } catch (e) {
    throw trans.invalidNodeId(nodeId);
  }

  // update1: accept pending request
  const update1 = await locked.query(`update users_nodes set accepted = true, expire_after = $3
    where user_id = $1 and node_id = $2 and accepted = false`, [userId, nodeId, expireAfter]);
  if (update1.rowCount === 1) {
    // TODO: update users_valids as well
    return update1;
  }

  // update2: update expireAfter on already granted node
  const update2 = await locked.query(`update users_nodes set expire_after = $3
    where user_id = $1 and node_id = $2`, [userId, nodeId, expireAfter]);
  if (update2.rowCount === 1) {
    return update2;
  }

  // insert
  try {
    const insert = await locked.query(`insert into users_nodes (user_id, node_id, expire_after,
      accepted) values ($1, $2, $3, true)`, [userId, nodeId, expireAfter]);
    // TODO: update users_valids as well
    return insert;
  } catch (e) {
    if (e.constraint === 'users_nodes_user_id_fkey') {
      throw trans.invalidUserId(userId);
    }
    throw e;
  }
}
