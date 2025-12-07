export class HttpException extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: unknown[]
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request', errors?: unknown[]) {
    super(400, message, errors);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}

export class ConflictException extends HttpException {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export class ValidationException extends HttpException {
  constructor(message = 'Validation Failed', errors?: unknown[]) {
    super(422, message, errors);
  }
}

// Domain-specific exceptions
export class UserNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid credentials');
  }
}

export class AccountLockedException extends UnauthorizedException {
  constructor(remainingMinutes: number) {
    super(`Account locked. Try again in ${remainingMinutes} minutes`);
  }
}

export class AccountInactiveException extends UnauthorizedException {
  constructor() {
    super('Account is not active');
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor(message = 'Invalid or expired token') {
    super(message);
  }
}

/**
 * Exception for weak password validation failures.
 *
 * Security: Uses a generic default message to prevent attackers from
 * learning which specific password rule failed, which could be used
 * to enumerate valid passwords faster through incremental crafting.
 */
export class WeakPasswordException extends BadRequestException {
  private static readonly DEFAULT_MESSAGE =
    'Password does not meet security requirements. ' +
    'Must be 8-128 characters with uppercase, lowercase, number, and special character.';

  constructor(message: string = WeakPasswordException.DEFAULT_MESSAGE) {
    super(message);
  }
}

export class UserAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}
