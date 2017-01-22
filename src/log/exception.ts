import { unknownError } from '../translations';
import ErrorMessage from '../types/ErrorMessage';
import log from './log';

/**
 * Catches unhandled exception and converts it into appropriate message
 */
export function wrapPromise<T>(promise: Promise<T>): Promise<T> {
  return promise.catch(error => Promise.reject(wrapError(error)));
}

/**
 * Wrap unhandled error
 * Log the error and coverts it into an error message
 */
export function wrapError(error: Error): ErrorMessage {
  if (error instanceof ErrorMessage) {
    return error;
  }
  log(error);
  return unknownError(error);
}
