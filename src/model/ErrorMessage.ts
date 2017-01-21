import Translation from './Translation';

/**
 * Error message that can be thrown.
 */
class ErrorMessage extends Error {
  constructor(readonly msg: Translation, readonly error?: Error) {
    super(msg.en);
  }
}

export default ErrorMessage;
