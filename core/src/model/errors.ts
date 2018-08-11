/**
 * Errors.
 */

/**
 * An error which should be handled by API implementations.
 */
export class ControllableError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class NoSuchEntryError extends ControllableError {
  constructor() {
    super('No such entry')
  }
}

export class AuthenticationError extends ControllableError {
  constructor() {
    super('Authencation fail')
  }
}
