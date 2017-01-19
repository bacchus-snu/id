import I18N from '../I18N';
import Term from './Term';

/**
 * A node associated to a user represents a permission or property of the user.
 *
 * 'association set of a user' = closure('granted set of the user')
 * 'valid set of a user' = 'association set of the user' - 'mask set of the user'
 * Granted set of a user is stored in users_nodes table
 * Denied set of a user is stored in users_masks table
 * Valid set of a user is stored in users_valids table
 */
interface Node {
  // Magic number of this node. Should not be changed once issued.
  // This value is stored in database to represent this node.
  nodeId: number;
  // Name of this node. Should not be changed once issued.
  // This value is used for third party apps to refer this node.
  name: string;
  // Description of this node for human.
  description: I18N;
  // Association of this node with a user implies associations of all implied nodes with the user.
  implies: Array<Node>;
  // When all the 'impliedBy' nodes are associated with a user,
  // this node is also associated with the user.
  impliedBy: Array<Node>;
  // For any permissions related to this node to be acknowledged,
  // user must accept all the specified terms.
  requiredTerms: Array<Term>;
}

export default Node;
