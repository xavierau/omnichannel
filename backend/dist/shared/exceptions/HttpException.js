"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerErrorException = exports.ConflictException = exports.BadRequestException = exports.NotFoundException = exports.ForbiddenException = exports.UnauthorizedException = exports.HttpException = void 0;
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
class BadRequestException extends HttpException {
    constructor(message = 'Bad Request', errors) {
        super(400, message, errors);
    }
}
exports.BadRequestException = BadRequestException;
class ConflictException extends HttpException {
    constructor(message = 'Conflict') {
        super(409, message);
    }
}
exports.ConflictException = ConflictException;
class InternalServerErrorException extends HttpException {
    constructor(message = 'Internal Server Error') {
        super(500, message);
    }
}
exports.InternalServerErrorException = InternalServerErrorException;
