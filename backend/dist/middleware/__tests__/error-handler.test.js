"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_handler_1 = require("../error-handler");
const HttpException_1 = require("@shared/exceptions/HttpException");
const logger_config_1 = require("@config/logger.config");
// Mock the logger
jest.mock('@config/logger.config', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
    },
}));
describe('errorHandler', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    let jsonMock;
    let statusMock;
    let setHeaderMock;
    const originalEnv = process.env.NODE_ENV;
    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn();
        setHeaderMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            context: {
                correlationId: 'test-correlation-id',
                startTime: Date.now() - 100,
            },
            method: 'POST',
            originalUrl: '/api/test',
            path: '/api/test',
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-user-agent'),
            user: undefined,
        };
        mockResponse = {
            status: statusMock,
            setHeader: setHeaderMock,
        };
        nextFunction = jest.fn();
    });
    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });
    describe('HttpException handling', () => {
        it('should handle BadRequestException (400) with warn log level', () => {
            const error = new HttpException_1.HttpException(400, 'Bad request data');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.warn).toHaveBeenCalled();
            expect(logger_config_1.logger.error).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: 'Bad request data',
                correlationId: 'test-correlation-id',
                path: '/api/test',
            }));
        });
        it('should handle UnauthorizedException (401) with warn log level', () => {
            const error = new HttpException_1.HttpException(401, 'Unauthorized access');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.warn).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should handle NotFoundException (404) with warn log level', () => {
            const error = new HttpException_1.HttpException(404, 'Resource not found');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.warn).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(404);
        });
        it('should handle InternalServerError (500) with error log level', () => {
            const error = new HttpException_1.HttpException(500, 'Internal server error');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.error).toHaveBeenCalled();
            expect(logger_config_1.logger.warn).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(500);
        });
        it('should include validation errors for 4xx responses', () => {
            const validationErrors = [
                { field: 'email', message: 'Invalid email format' },
            ];
            const error = new HttpException_1.HttpException(422, 'Validation failed', validationErrors);
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 422,
                errors: validationErrors,
            }));
        });
    });
    describe('unknown error handling', () => {
        it('should treat unknown errors as 500 Internal Server Error', () => {
            const error = new Error('Something went wrong');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.error).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(500);
        });
        it('should not expose internal error details in production', () => {
            process.env.NODE_ENV = 'production';
            const error = new Error('Database connection failed with password xyz');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Internal server error',
            }));
        });
        it('should expose error details in development for debugging', () => {
            process.env.NODE_ENV = 'development';
            const error = new Error('Database connection failed');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Database connection failed',
            }));
        });
        it('should not include validation errors for 5xx responses', () => {
            const error = new HttpException_1.HttpException(500, 'Server error', [
                { internal: 'debug info' },
            ]);
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            const responseArg = jsonMock.mock.calls[0][0];
            expect(responseArg.errors).toBeUndefined();
        });
    });
    describe('request context logging', () => {
        it('should include request context in log metadata', () => {
            const error = new HttpException_1.HttpException(400, 'Bad request');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                correlationId: 'test-correlation-id',
                method: 'POST',
                url: '/api/test',
                path: '/api/test',
                ip: '127.0.0.1',
                userAgent: 'test-user-agent',
            }));
        });
        it('should include user ID when authenticated', () => {
            // Use type assertion to bypass strict typing for test
            mockRequest.user = { id: 'user-123' };
            const error = new HttpException_1.HttpException(403, 'Forbidden');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                userId: 'user-123',
            }));
        });
        it('should log "anonymous" for unauthenticated requests', () => {
            mockRequest.user = undefined;
            const error = new HttpException_1.HttpException(401, 'Unauthorized');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                userId: 'anonymous',
            }));
        });
        it('should include request duration in logs', () => {
            const error = new HttpException_1.HttpException(400, 'Bad request');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                duration: expect.stringMatching(/^\d+ms$/),
            }));
        });
    });
    describe('correlation ID in response', () => {
        it('should set correlation ID header in response', () => {
            const error = new HttpException_1.HttpException(400, 'Bad request');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(setHeaderMock).toHaveBeenCalledWith('x-correlation-id', 'test-correlation-id');
        });
        it('should include correlation ID in response body', () => {
            const error = new HttpException_1.HttpException(400, 'Bad request');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                correlationId: 'test-correlation-id',
            }));
        });
        it('should handle missing request context gracefully', () => {
            const requestWithoutContext = {
                ...mockRequest,
                context: undefined,
            };
            const error = new HttpException_1.HttpException(400, 'Bad request');
            // Should not throw
            expect(() => {
                (0, error_handler_1.errorHandler)(error, requestWithoutContext, mockResponse, nextFunction);
            }).not.toThrow();
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                correlationId: 'unknown',
            }));
        });
    });
    describe('error response structure', () => {
        it('should return consistent error response shape', () => {
            const error = new HttpException_1.HttpException(400, 'Bad request');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('statusCode');
            expect(response).toHaveProperty('message');
            expect(response).toHaveProperty('correlationId');
            expect(response).toHaveProperty('timestamp');
            expect(response).toHaveProperty('path');
        });
        it('should include ISO timestamp in response', () => {
            const error = new HttpException_1.HttpException(400, 'Bad request');
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            const response = jsonMock.mock.calls[0][0];
            expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
        });
    });
    describe('stack trace sanitization', () => {
        it('should sanitize password in stack traces', () => {
            const error = new Error('Connection failed');
            error.stack = 'Error at password=mysecretpassword in config.js:10';
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                stack: expect.stringContaining('password=[REDACTED]'),
            }));
            expect(logger_config_1.logger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                stack: expect.not.stringContaining('mysecretpassword'),
            }));
        });
        it('should sanitize tokens in stack traces', () => {
            const error = new Error('Auth failed');
            error.stack = 'Error at token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 in auth.js:20';
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                stack: expect.stringContaining('token=[REDACTED]'),
            }));
        });
        it('should sanitize API keys in stack traces', () => {
            const error = new Error('API call failed');
            error.stack = 'Error with api_key=sk_live_abc123 in service.js:30';
            (0, error_handler_1.errorHandler)(error, mockRequest, mockResponse, nextFunction);
            expect(logger_config_1.logger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                stack: expect.stringContaining('apikey=[REDACTED]'),
            }));
        });
    });
});
