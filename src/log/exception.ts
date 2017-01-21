import ErrorMessage from '../model/ErrorMessage';
import { unknownError } from '../translations';
import log from './log';

/**
 * Catches unhandled exception and converts it into appropriate message
 */
function u<T>(promise: Promise<T>): Promise<T> {
  return promise.catch(error => {
    // handled exception
    if (error instanceof ErrorMessage) {
      return Promise.reject(error);
    }
    // unhandled exception
    log(error);
    return Promise.reject(unknownError(error));
  });
}

export default u;
