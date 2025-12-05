import { Request, Response } from 'express';
import {
  requestContextMiddleware,
  getCorrelationId,
  getRequestStartTime,
  hasRequestContext,
  RequestWithContext,
  CORRELATION_ID_HEADER,
} from '../request-context';
import { v4 as uuidv4, resetMockUuid } from '../../__mocks__/uuid';

describe('requestContextMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    resetMockUuid();
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
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const requestWithContext = mockRequest as RequestWithContext;
      expect(requestWithContext.context.correlationId).toBe('mock-uuid-0001');
    });

    it('should use client-provided correlation ID when valid', () => {
      const clientCorrelationId = 'client-provided-id-123';
      (mockRequest.get as jest.Mock).mockReturnValue(clientCorrelationId);

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const requestWithContext = mockRequest as RequestWithContext;
      expect(requestWithContext.context.correlationId).toBe(clientCorrelationId);
    });

    it('should generate new ID when client-provided ID is empty', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('');

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const requestWithContext = mockRequest as RequestWithContext;
      expect(requestWithContext.context.correlationId).toBe('mock-uuid-0001');
    });

    it('should generate new ID when client-provided ID is too long', () => {
      const longId = 'a'.repeat(200);
      (mockRequest.get as jest.Mock).mockReturnValue(longId);

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const requestWithContext = mockRequest as RequestWithContext;
      expect(requestWithContext.context.correlationId).toBe('mock-uuid-0001');
    });

    it('should generate new ID when client-provided ID contains invalid characters', () => {
      (mockRequest.get as jest.Mock).mockReturnValue('invalid<script>id');

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const requestWithContext = mockRequest as RequestWithContext;
      expect(requestWithContext.context.correlationId).toBe('mock-uuid-0001');
    });

    it('should accept valid correlation IDs with hyphens and underscores', () => {
      const validId = 'valid_correlation-id_123';
      (mockRequest.get as jest.Mock).mockReturnValue(validId);

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const requestWithContext = mockRequest as RequestWithContext;
      expect(requestWithContext.context.correlationId).toBe(validId);
    });
  });

  describe('response headers', () => {
    it('should set correlation ID in response headers', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        'mock-uuid-0001'
      );
    });
  });

  describe('request context', () => {
    it('should attach context with startTime', () => {
      const beforeTime = Date.now();
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const afterTime = Date.now();
      const requestWithContext = mockRequest as RequestWithContext;

      expect(requestWithContext.context.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(requestWithContext.context.startTime).toBeLessThanOrEqual(afterTime);
    });

    it('should call next function', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      requestContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

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
    } as RequestWithContext;

    expect(getCorrelationId(mockRequest)).toBe('test-correlation-id');
  });

  it('should return "unknown" when context does not exist', () => {
    const mockRequest = {} as Request;

    expect(getCorrelationId(mockRequest)).toBe('unknown');
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
    } as RequestWithContext;

    expect(getRequestStartTime(mockRequest)).toBe(startTime);
  });

  it('should return current time when context does not exist', () => {
    const beforeTime = Date.now();
    const mockRequest = {} as Request;

    const result = getRequestStartTime(mockRequest);
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
    } as RequestWithContext;

    expect(hasRequestContext(mockRequest)).toBe(true);
  });

  it('should return false when request has no context', () => {
    const mockRequest = {} as Request;

    expect(hasRequestContext(mockRequest)).toBe(false);
  });

  it('should return false when context is undefined', () => {
    const mockRequest = { context: undefined } as unknown as Request;

    expect(hasRequestContext(mockRequest)).toBe(false);
  });
});
