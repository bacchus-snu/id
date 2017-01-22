import { conflicts, nodes } from '../nodes';
import * as trans from '../translations';
import Conflict from '../types/Conflict';
import Node from '../types/Node';
import Term from '../types/Term';

interface NodesByName {
  [nodeName: string]: Node | undefined;
}

interface LoadedNodes {
  // set of nodes
  nodes: Set<Node>;

  // can index a node by its nodeId
  byId: Array<Node>;

  // can index a node by its name
  byName: NodesByName;

  // list of nodes that has 'impliedBy'
  hasImpliedBy: Set<Node>;

  // set of conflicting nodes by nodeId
  conflicts: Array<Set<Node>>;

  // set of nodeIds of conflicting nodes by nodeId
  conflictIds: Array<Set<number>>;

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
  const hasImpliedBy: Set<Node> = new Set();
  for (const node of list) {
    if (node.impliedBy.length !== 0) {
      hasImpliedBy.add(node);
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
  const conflictIds: Array<Set<number>> = [];
  for (const node of list) {
    conflictIds[node.nodeId] = new Set();
    for (const conflictNode of conflicts[node.nodeId]) {
      conflictIds[node.nodeId].add(conflictNode.nodeId);
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

  return { nodes: new Set(list), byId, byName, hasImpliedBy, conflicts, conflictIds, closures,
    acks, ackTs };
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
  // not fulfilled => add to t
  if (!fulfilled(node, accepted)) {
    t.add(node);
    return;
  }

  // fuilfilled
  set.add(node);

  // include the implied
  for (const implied of node.implies) {
    if (!set.has(implied) && !t.has(implied)) {
      closureAck(accepted, implied, set, t);
    }
  }
}

/**
 * Checks whether or not term acceptance is fulfilled
 */
function fulfilled(node: Node, accepted: Array<Term>): boolean {
  for (const term of node.requiredTerms) {
    if (!accepted.includes(term)) {
      return false;
    }
  }
  return true;
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

/**
 * Get conflicting nodes
 */
export function getConflicts(nodeId: number): Set<Node> {
  const conflicts = loadedNodes.conflicts[nodeId];
  if (conflicts === undefined) {
    throw trans.invalidNodeId(nodeId);
  }
  return conflicts;
}

/**
 * Get conflicting nodeIds
 */
export function getConflictIds(nodeId: number): Set<number> {
  const conflicts = loadedNodes.conflictIds[nodeId];
  if (conflicts === undefined) {
    throw trans.invalidNodeId(nodeId);
  }
  return conflicts;
}

/**
 * Get associated set from approved set
 */
export function associated(approved: Set<Node>): Set<Node> {
  let associated: Set<Node> = new Set();
  let addings: Set<Node>;

  // Any approved nodes are also associated
  addings = approved;

  while (addings.size !== 0) {
    // Nodes that any associated nodes 'imply' are also associated to the user
    // associated([A, B]) = associated([A]) union associated([B]), except for 'impliedBy'
    for (const adding of addings) {
      associated = new Set([...associated, ...(loadedNodes.closures[adding.nodeId])]);
    }

    // check nodes that have impliedBy and see whether we can add them to associated set
    addings = addingImpliedByNodes(associated);
  }

  // There's nothing to add to the associated set
  return associated;
}

/**
 * Get acknowledged set from approved set and accepted terms
 */
export function acknowledged(approved: Set<Node>, accepted: Array<Term>): Set<Node> {
  let acknowledged: Set<Node> = new Set();
  let addings: Set<Node> = new Set();

  // an approved node is acknowledged if acceptance status of all requiredTerms are ok
  for (const appr of approved) {
    if (fulfilled(appr, accepted)) {
      addings.add(appr);
    }
  }

  while (addings.size !== 0) {
    for (const adding of addings) {
      const ack = loadedNodes.acks[adding.nodeId];
      const ackTs = loadedNodes.ackTs[adding.nodeId];

      // A node that anyone of acknowledged nodes implies and which requires subset of the
      // requiredTerm of acknowledged node is also an acknowledged node
      acknowledged = new Set([...acknowledged, ...ack]);

      // Nodes may be included in acknowledged set
      for (const ackT of ackTs) {
        if (fulfilled(ackT, accepted)) {
          acknowledged.add(ackT);
        }
      }
    }
    addings = addingImpliedByNodes(acknowledged);
  }

  return acknowledged;
}

/**
 * check nodes that have impliedBy and see whether we can add them to addings set
 */
function addingImpliedByNodes(set: Set<Node>): Set<Node> {
  const addings = new Set();

  HasImpliedBy:
  for (const hasImpliedBy of loadedNodes.hasImpliedBy) {
    if (set.has(hasImpliedBy)) {
      continue;
    }
    for (const implication of hasImpliedBy.impliedBy) {
      if (!set.has(implication)) {
        continue HasImpliedBy;
      }
    }
    addings.add(hasImpliedBy);
  }
  return addings;
}
