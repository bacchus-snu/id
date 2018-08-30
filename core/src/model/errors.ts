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

export class NotActivatedError extends ControllableError {
  constructor() {
    super('Account not activated yet')
  }
}

export class ExpiredTokenError extends ControllableError {
  constructor() {
    super('Token expired')
  }
}

export class ResendLimitExeededError extends ControllableError {
  constructor() {
    super('Resend limit exceeded')
  }
}
