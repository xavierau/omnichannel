"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_context_1 = require("../request-context");
const uuid_1 = require("../../__mocks__/uuid");
describe('requestContextMiddleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    beforeEach(() => {
        (0, uuid_1.resetMockUuid)();
        mockRequest = {
            get: jest.fn(),
        };
        mockResponse = {
            setHeader: jest.fn(),
        };
        nextFunction = jest.fn();
    });
    describe('correlation ID generation', () => {
        it('should generate a new correlation ID when none is provided', () => {
            mockRequest.get.mockReturnValue(undefined);
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            const requestWithContext = mockRequest;
            expect(requestWithContext.context.correlationId).toBe('mock-uuid-0001');
        });
        it('should use client-provided correlation ID when valid', () => {
            const clientCorrelationId = 'client-provided-id-123';
            mockRequest.get.mockReturnValue(clientCorrelationId);
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            const requestWithContext = mockRequest;
            expect(requestWithContext.context.correlationId).toBe(clientCorrelationId);
        });
        it('should generate new ID when client-provided ID is empty', () => {
            mockRequest.get.mockReturnValue('');
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            const requestWithContext = mockRequest;
            expect(requestWithContext.context.correlationId).toBe('mock-uuid-0001');
        });
        it('should generate new ID when client-provided ID is too long', () => {
            const longId = 'a'.repeat(200);
            mockRequest.get.mockReturnValue(longId);
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            const requestWithContext = mockRequest;
            expect(requestWithContext.context.correlationId).toBe('mock-uuid-0001');
        });
        it('should generate new ID when client-provided ID contains invalid characters', () => {
            mockRequest.get.mockReturnValue('invalid<script>id');
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            const requestWithContext = mockRequest;
            expect(requestWithContext.context.correlationId).toBe('mock-uuid-0001');
        });
        it('should accept valid correlation IDs with hyphens and underscores', () => {
            const validId = 'valid_correlation-id_123';
            mockRequest.get.mockReturnValue(validId);
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            const requestWithContext = mockRequest;
            expect(requestWithContext.context.correlationId).toBe(validId);
        });
    });
    describe('response headers', () => {
        it('should set correlation ID in response headers', () => {
            mockRequest.get.mockReturnValue(undefined);
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.setHeader).toHaveBeenCalledWith(request_context_1.CORRELATION_ID_HEADER, 'mock-uuid-0001');
        });
    });
    describe('request context', () => {
        it('should attach context with startTime', () => {
            const beforeTime = Date.now();
            mockRequest.get.mockReturnValue(undefined);
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            const afterTime = Date.now();
            const requestWithContext = mockRequest;
            expect(requestWithContext.context.startTime).toBeGreaterThanOrEqual(beforeTime);
            expect(requestWithContext.context.startTime).toBeLessThanOrEqual(afterTime);
        });
        it('should call next function', () => {
            mockRequest.get.mockReturnValue(undefined);
            (0, request_context_1.requestContextMiddleware)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });
    });
});
describe('getCorrelationId', () => {
    it('should return correlation ID when context exists', () => {
        const mockRequest = {
            context: {
                correlationId: 'test-correlation-id',
                startTime: Date.now(),
            },
        };
        expect((0, request_context_1.getCorrelationId)(mockRequest)).toBe('test-correlation-id');
    });
    it('should return "unknown" when context does not exist', () => {
        const mockRequest = {};
        expect((0, request_context_1.getCorrelationId)(mockRequest)).toBe('unknown');
    });
});
describe('getRequestStartTime', () => {
    it('should return start time when context exists', () => {
        const startTime = Date.now() - 1000;
        const mockRequest = {
            context: {
                correlationId: 'test-id',
                startTime,
            },
        };
        expect((0, request_context_1.getRequestStartTime)(mockRequest)).toBe(startTime);
    });
    it('should return current time when context does not exist', () => {
        const beforeTime = Date.now();
        const mockRequest = {};
        const result = (0, request_context_1.getRequestStartTime)(mockRequest);
        const afterTime = Date.now();
        expect(result).toBeGreaterThanOrEqual(beforeTime);
        expect(result).toBeLessThanOrEqual(afterTime);
    });
});
describe('hasRequestContext', () => {
    it('should return true when request has context', () => {
        const mockRequest = {
            context: {
                correlationId: 'test-id',
                startTime: Date.now(),
            },
        };
        expect((0, request_context_1.hasRequestContext)(mockRequest)).toBe(true);
    });
    it('should return false when request has no context', () => {
        const mockRequest = {};
        expect((0, request_context_1.hasRequestContext)(mockRequest)).toBe(false);
    });
    it('should return false when context is undefined', () => {
        const mockRequest = { context: undefined };
        expect((0, request_context_1.hasRequestContext)(mockRequest)).toBe(false);
    });
});
