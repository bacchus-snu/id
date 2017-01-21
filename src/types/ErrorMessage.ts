import Translation from './Translation';

/**
 * Error message for end users
 */
class ErrorMessage extends Error {
  /**
   * Provided error means unhandled server-side exception.
   */
  constructor(readonly msg: Translation, readonly error?: Error) {
    super(msg.en);
  }

  /**
   * Returns HTTP status code for this error
   */
  get statusCode(): number {
    return this.error ? 500 : 400;
  }
}

export default ErrorMessage;
