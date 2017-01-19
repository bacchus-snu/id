import Node from './Node';

/**
 * Granting node a will automatically revoke node b, and vice versa.
 */
interface Conflict {
  a: Node;
  b: Node;
}

export default Conflict;
