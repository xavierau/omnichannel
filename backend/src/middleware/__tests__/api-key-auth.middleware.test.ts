import { Request, Response, NextFunction } from 'express';
import { ApiKeyPermission } from '@features/api-keys/enums/api-key-permission.enum';

// Mock the audit logger first (before any imports that might use it)
const mockAuditLogger = {
  warn: jest.fn(),
  info: jest.fn(),
};

jest.mock('@config/logger.config', () => ({
  auditLogger: mockAuditLogger,
}));

// Create mock service before importing middleware
const mockValidateKey = jest.fn();
const mockRecordUsage = jest.fn().mockResolvedValue(undefined);

jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn().mockReturnValue({
      validateKey: mockValidateKey,
      recordUsage: mockRecordUsage,
    }),
  },
  singleton: () => () => {},
  inject: () => () => {},
}));

// Now import the middleware after mocks are set up
import {
  apiKeyAuth,
  requireApiKeyPermission,
  validateChannelAccountScope,
} from '../api-key-auth.middleware';

/**
 * Mock API key interface for tests.
 */
interface MockApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: ApiKeyPermission[];
  isActive: boolean;
  expiresAt: Date | null;
  channelAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
  hasAnyPermission: (permissions: ApiKeyPermission[]) => boolean;
  hasPermission: (permission: ApiKeyPermission) => boolean;
}

describe('api-key-auth.middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock<NextFunction>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const createMockApiKey = (overrides: Partial<MockApiKey> = {}): MockApiKey => {
    const permissions = overrides.permissions ?? [
      ApiKeyPermission.CONVERSATION_READ,
      ApiKeyPermission.MESSAGE_SEND,
    ];

    return {
      id: 'api-key-123',
      tenantId: 'tenant-456',
      name: 'Test API Key',
      keyHash: 'hashed-key',
      keyPrefix: 'omni_abc123',
      permissions,
      isActive: true,
      expiresAt: null,
      channelAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      hasAnyPermission: (requiredPerms: ApiKeyPermission[]) =>
        requiredPerms.some((p) => permissions.includes(p)),
      hasPermission: (permission: ApiKeyPermission) =>
        permissions.includes(permission),
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
      get: jest.fn().mockImplementation((header: string) => {
        const headers = mockRequest.headers as Record<string, string>;
        return headers[header.toLowerCase()];
      }),
      path: '/api/conversations',
      method: 'GET',
      params: {},
    };

    mockResponse = {
      status: statusMock,
    };

    nextFunction = jest.fn();
  });

  describe('apiKeyAuth', () => {
    describe('API key extraction', () => {
      it('should extract API key from Authorization Bearer header', async () => {
        const mockApiKey = createMockApiKey();
        (mockRequest.headers as Record<string, string>)['authorization'] =
          'Bearer omni_test_key_12345';
        mockValidateKey.mockResolvedValue(mockApiKey);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockValidateKey).toHaveBeenCalledWith('omni_test_key_12345');
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should extract API key from X-API-Key header', async () => {
        const mockApiKey = createMockApiKey();
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'omni_another_key_67890';
        mockValidateKey.mockResolvedValue(mockApiKey);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockValidateKey).toHaveBeenCalledWith('omni_another_key_67890');
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should prefer Authorization header over X-API-Key header', async () => {
        const mockApiKey = createMockApiKey();
        (mockRequest.headers as Record<string, string>)['authorization'] =
          'Bearer omni_auth_key';
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'omni_xapi_key';
        mockValidateKey.mockResolvedValue(mockApiKey);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockValidateKey).toHaveBeenCalledWith('omni_auth_key');
      });

      it('should return 401 when no API key is provided', async () => {
        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          statusCode: 401,
          message: 'API key is required',
          error: 'Unauthorized',
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should return 401 for invalid Authorization header format', async () => {
        (mockRequest.headers as Record<string, string>)['authorization'] =
          'InvalidFormat';

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          statusCode: 401,
          message: 'API key is required',
          error: 'Unauthorized',
        });
      });

      it('should return 401 for Basic auth instead of Bearer', async () => {
        (mockRequest.headers as Record<string, string>)['authorization'] =
          'Basic dXNlcjpwYXNz';

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          statusCode: 401,
          message: 'API key is required',
          error: 'Unauthorized',
        });
      });
    });

    describe('API key validation', () => {
      it('should return 401 for invalid API key', async () => {
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'invalid_key';
        // Service returns null for invalid, inactive, or expired keys
        mockValidateKey.mockResolvedValue(null);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          statusCode: 401,
          message: 'Invalid API key',
          error: 'Unauthorized',
        });
        expect(mockAuditLogger.warn).toHaveBeenCalledWith(
          'API key authentication failed: invalid key',
          expect.objectContaining({
            path: '/api/conversations',
            method: 'GET',
          })
        );
      });

      it('should return 401 for inactive API key', async () => {
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'inactive_key';
        // Service validates isActive and returns null if inactive
        mockValidateKey.mockResolvedValue(null);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          statusCode: 401,
          message: 'Invalid API key',
          error: 'Unauthorized',
        });
      });

      it('should return 401 for expired API key', async () => {
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'expired_key';
        // Service validates expiration and returns null if expired
        mockValidateKey.mockResolvedValue(null);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          statusCode: 401,
          message: 'Invalid API key',
          error: 'Unauthorized',
        });
      });
    });

    describe('successful authentication', () => {
      it('should attach apiKey to request on success', async () => {
        const mockApiKey = createMockApiKey();
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'valid_key';
        mockValidateKey.mockResolvedValue(mockApiKey);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect((mockRequest as Request).apiKey).toBe(mockApiKey);
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should attach tenantId to request on success', async () => {
        const mockApiKey = createMockApiKey({ tenantId: 'my-tenant-id' });
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'valid_key';
        mockValidateKey.mockResolvedValue(mockApiKey);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect((mockRequest as Request).tenantId).toBe('my-tenant-id');
      });

      it('should call recordUsage asynchronously without awaiting', async () => {
        const mockApiKey = createMockApiKey();
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'valid_key';
        mockValidateKey.mockResolvedValue(mockApiKey);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        // recordUsage should be called but not awaited
        expect(mockRecordUsage).toHaveBeenCalledWith(mockApiKey.id);
        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should pass errors to next() for error handler', async () => {
        (mockRequest.headers as Record<string, string>)['x-api-key'] =
          'valid_key';
        const testError = new Error('Database connection failed');
        mockValidateKey.mockRejectedValue(testError);

        await apiKeyAuth(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith(testError);
      });
    });
  });

  describe('requireApiKeyPermission', () => {
    beforeEach(() => {
      // Pre-authenticate for permission tests
      const mockApiKey = createMockApiKey({
        permissions: [
          ApiKeyPermission.CONVERSATION_READ,
          ApiKeyPermission.MESSAGE_SEND,
        ],
      });
      (mockRequest as Request).apiKey = mockApiKey as unknown as Request['apiKey'];
    });

    it('should call next() when API key has required permission', async () => {
      const middleware = requireApiKeyPermission(
        ApiKeyPermission.CONVERSATION_READ
      );

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should call next() when API key has any of the required permissions', async () => {
      const middleware = requireApiKeyPermission(
        ApiKeyPermission.CONVERSATION_ASSIGN,
        ApiKeyPermission.MESSAGE_SEND
      );

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 when API key lacks all required permissions', async () => {
      const middleware = requireApiKeyPermission(
        ApiKeyPermission.CONVERSATION_ASSIGN,
        ApiKeyPermission.CONVERSATION_UPDATE_STATUS
      );

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        statusCode: 403,
        message: 'Insufficient API key permissions',
        error: 'Forbidden',
        required: [
          ApiKeyPermission.CONVERSATION_ASSIGN,
          ApiKeyPermission.CONVERSATION_UPDATE_STATUS,
        ],
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when apiKey is not attached to request', async () => {
      delete (mockRequest as Request).apiKey;
      const middleware = requireApiKeyPermission(
        ApiKeyPermission.CONVERSATION_READ
      );

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'API key authentication required',
        error: 'Unauthorized',
      });
    });

    it('should log permission denial with audit logger', async () => {
      const middleware = requireApiKeyPermission(
        ApiKeyPermission.CONVERSATION_ASSIGN
      );

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockAuditLogger.warn).toHaveBeenCalledWith(
        'API key permission denied',
        expect.objectContaining({
          apiKeyId: 'api-key-123',
          tenantId: 'tenant-456',
          required: [ApiKeyPermission.CONVERSATION_ASSIGN],
          granted: [
            ApiKeyPermission.CONVERSATION_READ,
            ApiKeyPermission.MESSAGE_SEND,
          ],
        })
      );
    });
  });

  describe('validateChannelAccountScope', () => {
    it('should call next() when apiKey has no channel account scope', async () => {
      const mockApiKey = createMockApiKey({ channelAccountId: null });
      (mockRequest as Request).apiKey = mockApiKey as unknown as Request['apiKey'];

      await validateChannelAccountScope(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should call next() when request channelAccountId matches apiKey scope', async () => {
      const mockApiKey = createMockApiKey({
        channelAccountId: 'channel-acc-123',
      });
      (mockRequest as Request).apiKey = mockApiKey as unknown as Request['apiKey'];
      mockRequest.params = { channelAccountId: 'channel-acc-123' };

      await validateChannelAccountScope(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 when channelAccountId does not match apiKey scope', async () => {
      const mockApiKey = createMockApiKey({
        channelAccountId: 'channel-acc-123',
      });
      (mockRequest as Request).apiKey = mockApiKey as unknown as Request['apiKey'];
      mockRequest.params = { channelAccountId: 'different-channel' };

      await validateChannelAccountScope(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        statusCode: 403,
        message: 'API key is not authorized for this channel account',
        error: 'Forbidden',
      });
    });

    it('should return 401 when apiKey is not attached to request', async () => {
      delete (mockRequest as Request).apiKey;

      await validateChannelAccountScope(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should check body.channelAccountId if params not available', async () => {
      const mockApiKey = createMockApiKey({
        channelAccountId: 'channel-acc-456',
      });
      (mockRequest as Request).apiKey = mockApiKey as unknown as Request['apiKey'];
      mockRequest.params = {};
      mockRequest.body = { channelAccountId: 'channel-acc-456' };

      await validateChannelAccountScope(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should log scope violation with audit logger', async () => {
      const mockApiKey = createMockApiKey({
        channelAccountId: 'channel-acc-123',
      });
      (mockRequest as Request).apiKey = mockApiKey as unknown as Request['apiKey'];
      mockRequest.params = { channelAccountId: 'unauthorized-channel' };

      await validateChannelAccountScope(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockAuditLogger.warn).toHaveBeenCalledWith(
        'API key channel scope violation',
        expect.objectContaining({
          apiKeyId: 'api-key-123',
          allowedChannelAccountId: 'channel-acc-123',
          requestedChannelAccountId: 'unauthorized-channel',
        })
      );
    });
  });
});
