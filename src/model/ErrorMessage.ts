/**
 * Error message that can be thrown.
 */

import Translation from './Translation';

class ErrorMessage extends Error {
  constructor(readonly msg: Translation, readonly error?: Error) {
    super(msg.en);
  }
}

export default ErrorMessage;
