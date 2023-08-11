/**
 * Errors.
 */

/**
 * An error which should be handled by API implementations.
 */
export class ControllableError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class NoSuchEntryError extends ControllableError {
  constructor() {
    super('No such entry');
  }
}

export class AuthenticationError extends ControllableError {
  constructor() {
    super('Authencation fail');
  }
}

export class AuthorizationError extends ControllableError {
  constructor() {
    super('Authorization fail');
  }
}

export class NotActivatedError extends ControllableError {
  constructor() {
    super('Account not activated yet');
  }
}

export class ExpiredTokenError extends ControllableError {
  constructor() {
    super('Token expired');
  }
}

export class ResendLimitExeededError extends ControllableError {
  constructor() {
    super('Resend limit exceeded');
  }
}

export class InvalidEmailError extends ControllableError {
  constructor() {
    super('Invalid email');
  }
}

export class BadParameterError extends ControllableError {
  constructor() {
    super('Bad parameter');
  }
}

export class UserExistsError extends ControllableError {
  constructor() {
    super('User already exists');
  }
}

export class EmailInUseError extends ControllableError {
  constructor() {
    super('Email is already in use');
  }
}
