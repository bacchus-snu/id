import * as trans from '../translations';
import { Connection, QueryResult, TransactionWithLock } from './utils';

interface Grant {
  nodeId: number;
  expireAfter: Date | null;
}

/**
 * Select granted set
 * Warning: this function does not check the validity of userId
 */
export async function select(conn: Connection, userId: number): Promise<QueryResult> {
  return await conn.query(`select node_id, expire_after, accepted from users_nodes
    where user_id = $1`, [userId]);
}

/**
 * Grant/revoke node for user
 */
export async function modify(locked: TransactionWithLock, userId: number, grants: Array<Grant>,
  revokes: Array<number>): Promise<null> {
  // Get current granted set
  const granted = (await select(locked, userId)).rows;

  // calculate todos for grants
  const grantUpdateExpire: Set<Grant> = new Set();
  const grantAccept: Set<Grant> = new Set();
  const grantInsert: Set<Grant> = new Set();

  Grant:
  for (const grant of grants) {
    if (revokes.includes(grant.nodeId)) {
      throw trans.grantRevokeOverlap(grant.nodeId);
    }
    for (const g of granted) {
      if (g.node_id !== grant.nodeId) {
        continue;
      }
      if ((g.expire_after === null) !== (grant.expireAfter === null)) {
        grantUpdateExpire.add(grant);
        continue Grant;
      }
      if (grant.expireAfter !== null &&
          (g.expire_after.getTime() !== grant.expireAfter.getTime())) {
        grantUpdateExpire.add(grant);
        continue Grant;
      }
      if (g.accepted === false) {
        grantAccept.add(grant);
        continue Grant;
      }
      continue Grant;
    }
    grantInsert.add(grant);
  }

  // calculate todos for revoke
  const revokeRemove: Set<number> = new Set();
  Revoke:
  for (const revoke of revokes) {
    for (const g of granted) {
      if (g.node_id !== revoke) {
        continue;
      }
      revokeRemove.add(revoke);
      continue Revoke;
    }
  }

  // TODO
  throw new Error();
}
