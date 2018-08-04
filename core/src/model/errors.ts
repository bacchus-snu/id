/**
 * Errors.
 */

export class NoSuchEntryError extends Error {
  constructor() {
    super('No such entry')
  }
}
