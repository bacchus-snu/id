import Translation from './Translation';

/**
 * Error message for end users
 */
class ErrorMessage extends Error {
  public readonly statusCode: number;

  /**
   * Provided error means unhandled server-side exception.
   */
  constructor(readonly msg: Translation, readonly error?: Error, statusCode?: number) {
    super(msg.en);
    this.statusCode = statusCode === undefined ? 400 : statusCode;
  }
}

export default ErrorMessage;
