"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_key_permission_enum_1 = require("../../features/api-keys/enums/api-key-permission.enum");
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
    singleton: () => () => { },
    inject: () => () => { },
}));
// Now import the middleware after mocks are set up
const api_key_auth_middleware_1 = require("../api-key-auth.middleware");
describe('api-key-auth.middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    let jsonMock;
    let statusMock;
    const createMockApiKey = (overrides = {}) => {
        const permissions = overrides.permissions ?? [
            api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ,
            api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND,
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
            hasAnyPermission: (requiredPerms) => requiredPerms.some((p) => permissions.includes(p)),
            hasPermission: (permission) => permissions.includes(permission),
            ...overrides,
        };
    };
    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            headers: {},
            get: jest.fn().mockImplementation((header) => {
                const headers = mockRequest.headers;
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
                mockRequest.headers['authorization'] =
                    'Bearer omni_test_key_12345';
                mockValidateKey.mockResolvedValue(mockApiKey);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(mockValidateKey).toHaveBeenCalledWith('omni_test_key_12345');
                expect(nextFunction).toHaveBeenCalled();
            });
            it('should extract API key from X-API-Key header', async () => {
                const mockApiKey = createMockApiKey();
                mockRequest.headers['x-api-key'] =
                    'omni_another_key_67890';
                mockValidateKey.mockResolvedValue(mockApiKey);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(mockValidateKey).toHaveBeenCalledWith('omni_another_key_67890');
                expect(nextFunction).toHaveBeenCalled();
            });
            it('should prefer Authorization header over X-API-Key header', async () => {
                const mockApiKey = createMockApiKey();
                mockRequest.headers['authorization'] =
                    'Bearer omni_auth_key';
                mockRequest.headers['x-api-key'] =
                    'omni_xapi_key';
                mockValidateKey.mockResolvedValue(mockApiKey);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(mockValidateKey).toHaveBeenCalledWith('omni_auth_key');
            });
            it('should return 401 when no API key is provided', async () => {
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(statusMock).toHaveBeenCalledWith(401);
                expect(jsonMock).toHaveBeenCalledWith({
                    statusCode: 401,
                    message: 'API key is required',
                    error: 'Unauthorized',
                });
                expect(nextFunction).not.toHaveBeenCalled();
            });
            it('should return 401 for invalid Authorization header format', async () => {
                mockRequest.headers['authorization'] =
                    'InvalidFormat';
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(statusMock).toHaveBeenCalledWith(401);
                expect(jsonMock).toHaveBeenCalledWith({
                    statusCode: 401,
                    message: 'API key is required',
                    error: 'Unauthorized',
                });
            });
            it('should return 401 for Basic auth instead of Bearer', async () => {
                mockRequest.headers['authorization'] =
                    'Basic dXNlcjpwYXNz';
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
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
                mockRequest.headers['x-api-key'] =
                    'invalid_key';
                // Service returns null for invalid, inactive, or expired keys
                mockValidateKey.mockResolvedValue(null);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(statusMock).toHaveBeenCalledWith(401);
                expect(jsonMock).toHaveBeenCalledWith({
                    statusCode: 401,
                    message: 'Invalid API key',
                    error: 'Unauthorized',
                });
                expect(mockAuditLogger.warn).toHaveBeenCalledWith('API key authentication failed: invalid key', expect.objectContaining({
                    path: '/api/conversations',
                    method: 'GET',
                }));
            });
            it('should return 401 for inactive API key', async () => {
                mockRequest.headers['x-api-key'] =
                    'inactive_key';
                // Service validates isActive and returns null if inactive
                mockValidateKey.mockResolvedValue(null);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(statusMock).toHaveBeenCalledWith(401);
                expect(jsonMock).toHaveBeenCalledWith({
                    statusCode: 401,
                    message: 'Invalid API key',
                    error: 'Unauthorized',
                });
            });
            it('should return 401 for expired API key', async () => {
                mockRequest.headers['x-api-key'] =
                    'expired_key';
                // Service validates expiration and returns null if expired
                mockValidateKey.mockResolvedValue(null);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
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
                mockRequest.headers['x-api-key'] =
                    'valid_key';
                mockValidateKey.mockResolvedValue(mockApiKey);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(mockRequest.apiKey).toBe(mockApiKey);
                expect(nextFunction).toHaveBeenCalled();
            });
            it('should attach tenantId to request on success', async () => {
                const mockApiKey = createMockApiKey({ tenantId: 'my-tenant-id' });
                mockRequest.headers['x-api-key'] =
                    'valid_key';
                mockValidateKey.mockResolvedValue(mockApiKey);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(mockRequest.tenantId).toBe('my-tenant-id');
            });
            it('should call recordUsage asynchronously without awaiting', async () => {
                const mockApiKey = createMockApiKey();
                mockRequest.headers['x-api-key'] =
                    'valid_key';
                mockValidateKey.mockResolvedValue(mockApiKey);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                // recordUsage should be called but not awaited
                expect(mockRecordUsage).toHaveBeenCalledWith(mockApiKey.id);
                expect(nextFunction).toHaveBeenCalled();
            });
        });
        describe('error handling', () => {
            it('should pass errors to next() for error handler', async () => {
                mockRequest.headers['x-api-key'] =
                    'valid_key';
                const testError = new Error('Database connection failed');
                mockValidateKey.mockRejectedValue(testError);
                await (0, api_key_auth_middleware_1.apiKeyAuth)(mockRequest, mockResponse, nextFunction);
                expect(nextFunction).toHaveBeenCalledWith(testError);
            });
        });
    });
    describe('requireApiKeyPermission', () => {
        beforeEach(() => {
            // Pre-authenticate for permission tests
            const mockApiKey = createMockApiKey({
                permissions: [
                    api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ,
                    api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND,
                ],
            });
            mockRequest.apiKey = mockApiKey;
        });
        it('should call next() when API key has required permission', async () => {
            const middleware = (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ);
            await middleware(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });
        it('should call next() when API key has any of the required permissions', async () => {
            const middleware = (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_ASSIGN, api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND);
            await middleware(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });
        it('should return 403 when API key lacks all required permissions', async () => {
            const middleware = (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_ASSIGN, api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_UPDATE_STATUS);
            await middleware(mockRequest, mockResponse, nextFunction);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                statusCode: 403,
                message: 'Insufficient API key permissions',
                error: 'Forbidden',
                required: [
                    api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_ASSIGN,
                    api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_UPDATE_STATUS,
                ],
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
        it('should return 401 when apiKey is not attached to request', async () => {
            delete mockRequest.apiKey;
            const middleware = (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ);
            await middleware(mockRequest, mockResponse, nextFunction);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                statusCode: 401,
                message: 'API key authentication required',
                error: 'Unauthorized',
            });
        });
        it('should log permission denial with audit logger', async () => {
            const middleware = (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_ASSIGN);
            await middleware(mockRequest, mockResponse, nextFunction);
            expect(mockAuditLogger.warn).toHaveBeenCalledWith('API key permission denied', expect.objectContaining({
                apiKeyId: 'api-key-123',
                tenantId: 'tenant-456',
                required: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_ASSIGN],
                granted: [
                    api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ,
                    api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND,
                ],
            }));
        });
    });
    describe('validateChannelAccountScope', () => {
        it('should call next() when apiKey has no channel account scope', async () => {
            const mockApiKey = createMockApiKey({ channelAccountId: null });
            mockRequest.apiKey = mockApiKey;
            await (0, api_key_auth_middleware_1.validateChannelAccountScope)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });
        it('should call next() when request channelAccountId matches apiKey scope', async () => {
            const mockApiKey = createMockApiKey({
                channelAccountId: 'channel-acc-123',
            });
            mockRequest.apiKey = mockApiKey;
            mockRequest.params = { channelAccountId: 'channel-acc-123' };
            await (0, api_key_auth_middleware_1.validateChannelAccountScope)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });
        it('should return 403 when channelAccountId does not match apiKey scope', async () => {
            const mockApiKey = createMockApiKey({
                channelAccountId: 'channel-acc-123',
            });
            mockRequest.apiKey = mockApiKey;
            mockRequest.params = { channelAccountId: 'different-channel' };
            await (0, api_key_auth_middleware_1.validateChannelAccountScope)(mockRequest, mockResponse, nextFunction);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                statusCode: 403,
                message: 'API key is not authorized for this channel account',
                error: 'Forbidden',
            });
        });
        it('should return 401 when apiKey is not attached to request', async () => {
            delete mockRequest.apiKey;
            await (0, api_key_auth_middleware_1.validateChannelAccountScope)(mockRequest, mockResponse, nextFunction);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should check body.channelAccountId if params not available', async () => {
            const mockApiKey = createMockApiKey({
                channelAccountId: 'channel-acc-456',
            });
            mockRequest.apiKey = mockApiKey;
            mockRequest.params = {};
            mockRequest.body = { channelAccountId: 'channel-acc-456' };
            await (0, api_key_auth_middleware_1.validateChannelAccountScope)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });
        it('should log scope violation with audit logger', async () => {
            const mockApiKey = createMockApiKey({
                channelAccountId: 'channel-acc-123',
            });
            mockRequest.apiKey = mockApiKey;
            mockRequest.params = { channelAccountId: 'unauthorized-channel' };
            await (0, api_key_auth_middleware_1.validateChannelAccountScope)(mockRequest, mockResponse, nextFunction);
            expect(mockAuditLogger.warn).toHaveBeenCalledWith('API key channel scope violation', expect.objectContaining({
                apiKeyId: 'api-key-123',
                allowedChannelAccountId: 'channel-acc-123',
                requestedChannelAccountId: 'unauthorized-channel',
            }));
        });
    });
});
