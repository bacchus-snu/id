/**
 * TODO
 * Complete conflict map: a conflict b implies b conflict a
 * Guarantee unique nodeId and name
 */

import { conflicts, nodes } from '../nodes';
import * as trans from '../translations';
import Conflict from '../types/Conflict';
import Node from '../types/Node';
import Term from '../types/Term';

interface NodesByName {
  [nodeName: string]: Node | undefined;
}

interface LoadedNodes {
  // list of nodes
  list: Array<Node>;

  // can index a node by its nodeId
  byId: Array<Node>;

  // can index a node by its name
  byName: NodesByName;

  // list of nodes that has 'impliedBy'
  hasImpliedBy: Array<Node>;

  // set of conflicting nodes by nodeId
  conflicts: Array<Set<Node>>;

  // set of nodeIds of conflicting nodes by nodeId
  conflictIds: Array<Array<number>>;

  // Maximal set of associated nodes, given an associated node
  // closures[nodeX.nodeId] = {nodeA, nodeB, nodeC, ...};
  // means when nodeX is associated, then nodeA, nodeB, nodeC, ... are also associated
  // by 'implied' rules and nothing more
  closures: Array<Set<Node>>;

  // Maximal set of acknowledged nodes, given an acknowledged node
  // acks[nodeX.nodeId] = {nodeA, nodeB, ...};
  // means when nodeX is acknowledged, then nodeA, nodeB, ... are also acknowledged
  // ackTs[nodeX.nodeId] = {nodeC, nodeD, ...};
  // means when nodeX is acknowledged, then nodeC, nodeD, ... may also be acknowledged
  // according to additional term acceptance
  acks: Array<Set<Node>>;
  ackTs: Array<Set<Node>>;
}

/**
 * Load nodes and conflicts
 */
function load(list: Array<Node>, conflictList: Array<Conflict>): LoadedNodes {
  // Nodes by ID
  const byId: Array<Node> = [];
  for (const node of list) {
    if (byId[node.nodeId] !== undefined) {
      throw new Error('Duplicate nodeId ' + node.nodeId);
    }
    byId[node.nodeId] = node;
  }

  // Nodes by Name
  const byName: NodesByName = {};
  for (const node of list) {
    if (byName[node.name] !== undefined) {
      throw new Error('Duplicate nodeName ' + node.name);
    }
    byName[node.name] = node;
  }

  // hasImpliedBy
  const hasImpliedBy: Array<Node> = [];
  for (const node of list) {
    if (node.impliedBy.length !== 0) {
      hasImpliedBy.push(node);
    }
  }

  // Conflict map
  const conflicts: Array<Set<Node>> = [];
  for (const node of list) {
    conflicts[node.nodeId] = new Set();
  }
  for (const conflict of conflictList) {
    if (conflict.a === conflict.b) {
      throw new Error('Self-conflict: ' + conflict.a.nodeId);
    }
    conflicts[conflict.a.nodeId].add(conflict.b);
    conflicts[conflict.b.nodeId].add(conflict.a);
  }

  // Conflicting nodes
  const conflictIds: Array<Array<number>> = [];
  for (const node of list) {
    conflictIds[node.nodeId] = [];
    for (const conflictNode of conflicts[node.nodeId]) {
      conflictIds[node.nodeId].push(conflictNode.nodeId);
    }
  }

  // calculate closure by 'implies'
  const closures: Array<Set<Node>> = [];
  const acks: Array<Set<Node>> = [];
  const ackTs: Array<Set<Node>> = [];
  for (const node of list) {
    closures[node.nodeId] = closure(node, new Set());
    acks[node.nodeId] = new Set();
    ackTs[node.nodeId] = new Set();
    closureAck(node.requiredTerms, node, acks[node.nodeId], ackTs[node.nodeId]);
  }

  return { list, byId, byName, hasImpliedBy, conflicts, conflictIds, closures, acks, ackTs };
}

/**
 * Calculate closure of each node.
 */
function closure(node: Node, set: Set<Node>): Set<Node> {
  // Approved nodes are associated
  set.add(node);

  // nodes that associated nodes imply are also associated
  for (const implied of node.implies) {
    if (!set.has(implied)) {
      closure(implied, set);
    }
  }

  return set;
}

/**
 * Calcualte acknowledged closure
 */
function closureAck(accepted: Array<Term>, node: Node, set: Set<Node>, t: Set<Node>): void {
  // check whether or not term acceptance is fuilfilled by the given information
  let ok = true;
  for (const term of node.requiredTerms) {
    if (!accepted.includes(term)) {
      ok = false;
      break;
    }
  }

  // not fuilfilled => add to t
  if (!ok) {
    t.add(node);
    return;
  }

  // fuilfilled
  set.add(node);

  // implied
  for (const implied of node.implies) {
    if (!set.has(implied) && !t.has(implied)) {
      closureAck(accepted, implied, set, t);
    }
  }
}

const loadedNodes = load(nodes, conflicts);

/**
 * Get node by nodeId
 */
export function getById(nodeId: number): Node {
  const node = loadedNodes.byId[nodeId];
  if (node === undefined) {
    throw trans.invalidNodeId(nodeId);
  }
  return node;
}

/**
 * Get node by name
 */
export function getByName(name: string): Node {
  const node = loadedNodes.byName[name];
  if (node === undefined) {
    throw trans.nodeNameNotFound(name);
  }
  return node;
}
