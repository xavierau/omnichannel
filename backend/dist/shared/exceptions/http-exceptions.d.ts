export declare class HttpException extends Error {
    statusCode: number;
    message: string;
    errors?: unknown[] | undefined;
    constructor(statusCode: number, message: string, errors?: unknown[] | undefined);
}
export declare class BadRequestException extends HttpException {
    constructor(message?: string, errors?: unknown[]);
}
export declare class UnauthorizedException extends HttpException {
    constructor(message?: string);
}
export declare class ForbiddenException extends HttpException {
    constructor(message?: string);
}
export declare class NotFoundException extends HttpException {
    constructor(message?: string);
}
export declare class ConflictException extends HttpException {
    constructor(message?: string);
}
export declare class ValidationException extends HttpException {
    constructor(message?: string, errors?: unknown[]);
}
export declare class UserNotFoundException extends NotFoundException {
    constructor(identifier: string);
}
export declare class InvalidCredentialsException extends UnauthorizedException {
    constructor();
}
export declare class AccountLockedException extends UnauthorizedException {
    constructor(remainingMinutes: number);
}
export declare class AccountInactiveException extends UnauthorizedException {
    constructor();
}
export declare class InvalidTokenException extends UnauthorizedException {
    constructor(message?: string);
}
/**
 * Exception for weak password validation failures.
 *
 * Security: Uses a generic default message to prevent attackers from
 * learning which specific password rule failed, which could be used
 * to enumerate valid passwords faster through incremental crafting.
 */
export declare class WeakPasswordException extends BadRequestException {
    private static readonly DEFAULT_MESSAGE;
    constructor(message?: string);
}
export declare class UserAlreadyExistsException extends ConflictException {
    constructor(email: string);
}
