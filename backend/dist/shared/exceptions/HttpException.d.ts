export declare class HttpException extends Error {
    statusCode: number;
    message: string;
    errors?: unknown[] | undefined;
    constructor(statusCode: number, message: string, errors?: unknown[] | undefined);
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
export declare class BadRequestException extends HttpException {
    constructor(message?: string, errors?: unknown[]);
}
export declare class ConflictException extends HttpException {
    constructor(message?: string);
}
export declare class InternalServerErrorException extends HttpException {
    constructor(message?: string);
}
