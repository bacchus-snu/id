import * as trans from '../translations';
import { checkNodeIds, getConflictIds } from './nodes';
import { Connection, QueryResult, TransactionWithLock } from './utils';

interface Grant {
  nodeId: number;
  expireAfter: Date | null;
}

interface UsersNodesModifyResult {
  accepted: Array<Grant>;
  expireUpdated: Array<Grant>;
  inserted: Array<Grant>;
  revoked: Set<number>;
  rejected: Set<number>;
}

/**
 * Select granted set
 * Warning: this function does not check the validity of userId
 */
export function select(conn: Connection, userId: number): Promise<QueryResult> {
  return conn.query(`select node_id, expire_after, accepted from users_nodes
    where user_id = $1`, [userId]);
}

/**
 * Grant or remove(= revoke+reject) node for user
 */
export async function modify(locked: TransactionWithLock, userId: number, grants: Array<Grant>,
  inputRemoves: Array<number>): Promise<UsersNodesModifyResult> {
  // check nodeIds
  const grantIds = grants.map(x => x.nodeId);
  checkNodeIds(grantIds);
  checkNodeIds(inputRemoves);

  // lookup conflict nodes
  let removes: Set<number> = new Set(inputRemoves);
  for (const grant of grants) {
    removes = new Set([...removes, ...(getConflictIds(grant.nodeId))]);
  }

  // Get current granted set
  const granted = (await select(locked, userId)).rows;
  const grantedByNodeId: Array<any> = [];
  const granteds: Set<number> = new Set();
  for (const g of granted) {
    grantedByNodeId[g.node_id] = g;
    granteds.add(g.node_id);
  }

  // calculate todos for grants
  const grantUpdateExpire: Array<Grant> = [];
  const grantAccept: Array<Grant> = [];
  const grantInsert: Array<Grant> = [];

  // for mailing to user
  const accepted: Array<Grant> = [];
  const expireUpdated: Array<Grant> = grantUpdateExpire;
  const inserted: Array<Grant> = grantInsert;

  for (const grant of grants) {
    if (removes.has(grant.nodeId)) {
      throw trans.grantRemoveOverlap(grant.nodeId);
    }
    // fetch record in DB
    const g = grantedByNodeId[grant.nodeId];
    if (g === undefined) {
      grantInsert.push(grant);
      continue;
    }
    if ((g.expire_after === null) !== (grant.expireAfter === null)) {
      grantUpdateExpire.push(grant);
      if (g.accepted === false) {
        accepted.push(grant);
      }
      continue;
    }
    if (grant.expireAfter !== null &&
        (g.expire_after.getTime() !== grant.expireAfter.getTime())) {
      grantUpdateExpire.push(grant);
      if (g.accepted === false) {
        accepted.push(grant);
      }
      continue;
    }
    if (g.accepted === false) {
      grantAccept.push(grant);
      accepted.push(grant);
      continue;
    }
  }

  // calculate todos for remove
  const toRemove: Set<number> = new Set();

  // for mailing to user
  const revoked: Set<number> = new Set();
  const rejected: Set<number> = new Set();

  for (const remove of removes) {
    // fetch record in DB
    const g = grantedByNodeId[remove];
    if (g === undefined) {
      continue;
    }
    toRemove.add(remove);
    if (g.accepted === true) {
      revoked.add(remove);
    } else {
      rejected.add(remove);
    }
  }

  // do insert
  try {
    for (const insert of grantInsert) {
      await locked.query(`insert into users_nodes (user_id, node_id, expire_after, accepted)
        values ($1, $2, $3, true)`, [userId, insert.nodeId, insert.expireAfter]);
    }
  } catch (e) {
    if (e.constraint === 'users_nodes_user_id_fkey') {
      throw trans.invalidUserId(userId);
    }
    throw e;
  }
  // do accept
  if (grantAccept.length > 0) {
    await locked.query('update users_nodes set accepted = true where user_id = $1 and node_id in '
      + placeholders(2, grantAccept.length), [userId, ...(grantAccept.map(a => a.nodeId))]);
  }
  // do update expire
  for (const update of grantUpdateExpire) {
    await locked.query(`update users_nodes set accepted = true, expire_after = $1 where
      user_id = $2 and node_id = $3`, [update.expireAfter, userId, update.nodeId]);
  }
  // do remove
  if (toRemove.size > 0) {
    await locked.query('delete from users_nodes where user_id = $1 and node_id in '
      + placeholders(2, toRemove.size), [userId, ...toRemove]);
  }

  const result: UsersNodesModifyResult = { accepted, expireUpdated, inserted, revoked, rejected };

  // TODO: invoke users_valids.calculate to regenerate valids table
  // TODO: mail to users
  return result;
}

/**
 * Translate [a, b, c] into '($i, $(i+1), $(i+2), ...)'
 */
function placeholders(i: number, length: number): string {
  const idx: Array<string> = [...Array(length).keys()].map(x => '\$' + (x + i));
  return '(' + idx.join(',') + ')';
}
