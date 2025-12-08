"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAlreadyExistsException = exports.WeakPasswordException = exports.InvalidTokenException = exports.AccountInactiveException = exports.AccountLockedException = exports.InvalidCredentialsException = exports.UserNotFoundException = exports.ValidationException = exports.ConflictException = exports.NotFoundException = exports.ForbiddenException = exports.UnauthorizedException = exports.BadRequestException = exports.HttpException = void 0;
class HttpException extends Error {
    statusCode;
    message;
    errors;
    constructor(statusCode, message, errors) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.HttpException = HttpException;
class BadRequestException extends HttpException {
    constructor(message = 'Bad Request', errors) {
        super(400, message, errors);
    }
}
exports.BadRequestException = BadRequestException;
class UnauthorizedException extends HttpException {
    constructor(message = 'Unauthorized') {
        super(401, message);
    }
}
exports.UnauthorizedException = UnauthorizedException;
class ForbiddenException extends HttpException {
    constructor(message = 'Forbidden') {
        super(403, message);
    }
}
exports.ForbiddenException = ForbiddenException;
class NotFoundException extends HttpException {
    constructor(message = 'Not Found') {
        super(404, message);
    }
}
exports.NotFoundException = NotFoundException;
class ConflictException extends HttpException {
    constructor(message = 'Conflict') {
        super(409, message);
    }
}
exports.ConflictException = ConflictException;
class ValidationException extends HttpException {
    constructor(message = 'Validation Failed', errors) {
        super(422, message, errors);
    }
}
exports.ValidationException = ValidationException;
// Domain-specific exceptions
class UserNotFoundException extends NotFoundException {
    constructor(identifier) {
        super(`User not found: ${identifier}`);
    }
}
exports.UserNotFoundException = UserNotFoundException;
class InvalidCredentialsException extends UnauthorizedException {
    constructor() {
        super('Invalid credentials');
    }
}
exports.InvalidCredentialsException = InvalidCredentialsException;
class AccountLockedException extends UnauthorizedException {
    constructor(remainingMinutes) {
        super(`Account locked. Try again in ${remainingMinutes} minutes`);
    }
}
exports.AccountLockedException = AccountLockedException;
class AccountInactiveException extends UnauthorizedException {
    constructor() {
        super('Account is not active');
    }
}
exports.AccountInactiveException = AccountInactiveException;
class InvalidTokenException extends UnauthorizedException {
    constructor(message = 'Invalid or expired token') {
        super(message);
    }
}
exports.InvalidTokenException = InvalidTokenException;
/**
 * Exception for weak password validation failures.
 *
 * Security: Uses a generic default message to prevent attackers from
 * learning which specific password rule failed, which could be used
 * to enumerate valid passwords faster through incremental crafting.
 */
class WeakPasswordException extends BadRequestException {
    static DEFAULT_MESSAGE = 'Password does not meet security requirements. ' +
        'Must be 8-128 characters with uppercase, lowercase, number, and special character.';
    constructor(message = WeakPasswordException.DEFAULT_MESSAGE) {
        super(message);
    }
}
exports.WeakPasswordException = WeakPasswordException;
class UserAlreadyExistsException extends ConflictException {
    constructor(email) {
        super(`User with email ${email} already exists`);
    }
}
exports.UserAlreadyExistsException = UserAlreadyExistsException;
