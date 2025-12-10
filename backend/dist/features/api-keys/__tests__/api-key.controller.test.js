"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const tsyringe_1 = require("tsyringe");
const api_key_controller_1 = require("../controllers/api-key.controller");
const api_key_service_1 = require("../services/api-key.service");
const user_entity_1 = require("../../users/user.entity");
const api_key_permission_enum_1 = require("../enums/api-key-permission.enum");
const create_api_key_dto_1 = require("../dto/create-api-key.dto");
const csrf_protection_1 = require("../../../middleware/csrf-protection");
const request_context_1 = require("../../../middleware/request-context");
const validate_dto_1 = require("../../../middleware/validate-dto");
// Valid UUIDs for testing
const TEST_UUIDS = {
    tenant: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    user: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    apiKey: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    channelAccount: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
};
// Test error handler
const testErrorHandler = (err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.errors;
    res.status(statusCode).json({
        statusCode,
        message,
        ...(errors !== undefined && errors !== null && typeof errors === 'object' ? { errors } : {}),
    });
};
// Mock the logger
jest.mock('../../../config/logger.config', () => ({
    auditLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
describe('API Key Controller Integration Tests', () => {
    let app;
    let mockApiKeyService;
    const tenantId = TEST_UUIDS.tenant;
    const userId = TEST_UUIDS.user;
    // Test fixtures
    const mockUser = {
        id: userId,
        tenantId,
        email: 'admin@example.com',
        passwordHash: 'hash',
        firstName: 'Admin',
        lastName: 'User',
        status: user_entity_1.UserStatus.ACTIVE,
        emailVerified: true,
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        roles: [
            {
                id: 'role-1',
                name: 'admin',
                displayName: 'Admin',
                description: 'Admin role',
                level: 2,
                isSystem: false,
                permissions: [],
                users: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
        tenant: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    // Mock API Key List Item (returned by listKeys)
    const mockApiKeyListItem = {
        id: TEST_UUIDS.apiKey,
        name: 'Test API Key',
        keyPrefix: 'omni_test1234',
        permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ, api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND],
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        lastUsedAt: null,
        createdAt: new Date(),
        channelAccountId: null,
        createdById: userId,
    };
    // Helper to create full ApiKey with entity methods
    const createMockApiKey = (overrides = {}) => {
        const baseKey = {
            id: TEST_UUIDS.apiKey,
            tenantId,
            channelAccountId: null,
            channelAccount: null,
            name: 'Test API Key',
            keyHash: 'hashed_key_value',
            keyPrefix: 'omni_test1234',
            permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ, api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND],
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lastUsedAt: null,
            isActive: true,
            createdById: userId,
            createdBy: mockUser,
            tenant: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            isValid: () => true,
            isExpired: () => false,
            hasPermission: () => true,
            hasAllPermissions: () => true,
            hasAnyPermission: () => true,
            ...overrides,
        };
        return baseKey;
    };
    const mockApiKey = createMockApiKey();
    // Mock authentication middleware
    const mockAuthenticate = (req, _res, next) => {
        req.user = mockUser;
        next();
    };
    // Mock tenant middleware
    const mockRequireTenant = (req, _res, next) => {
        req.tenantId = tenantId;
        next();
    };
    beforeEach(() => {
        // Reset container
        tsyringe_1.container.clearInstances();
        // Create mock service
        mockApiKeyService = {
            createApiKey: jest.fn(),
            validateKey: jest.fn(),
            recordUsage: jest.fn(),
            revokeKey: jest.fn(),
            listKeys: jest.fn(),
            getKeyById: jest.fn(),
        };
        // Register mock service
        tsyringe_1.container.registerInstance(api_key_service_1.ApiKeyService, mockApiKeyService);
        // Create test app
        app = (0, express_1.default)();
        app.use(request_context_1.requestContextMiddleware);
        app.use(express_1.default.json());
        app.use((0, cookie_parser_1.default)());
        // CSRF token endpoint
        app.get('/csrf-token', csrf_protection_1.csrfEnsureToken, (req, res) => {
            res.json({ csrfToken: (0, csrf_protection_1.getCsrfToken)(req) });
        });
        // Create controller
        const controller = tsyringe_1.container.resolve(api_key_controller_1.ApiKeyController);
        // Routes
        app.get('/api/api-keys', mockAuthenticate, mockRequireTenant, controller.listKeys);
        app.post('/api/api-keys', mockAuthenticate, mockRequireTenant, csrf_protection_1.csrfValidateToken, (0, validate_dto_1.validateDto)(create_api_key_dto_1.CreateApiKeyDto), controller.createKey);
        app.delete('/api/api-keys/:id', mockAuthenticate, mockRequireTenant, csrf_protection_1.csrfValidateToken, controller.revokeKey);
        // Error handler
        app.use(testErrorHandler);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    // Helper to get CSRF token
    const getCsrf = async () => {
        const response = await (0, supertest_1.default)(app).get('/csrf-token');
        const cookies = response.headers['set-cookie'];
        const csrfCookie = cookies[0].split(';')[0];
        return {
            token: response.body.csrfToken,
            cookie: csrfCookie,
        };
    };
    describe('GET /api/api-keys - List API Keys', () => {
        it('should return all API keys for the tenant', async () => {
            mockApiKeyService.listKeys.mockResolvedValue([mockApiKeyListItem]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/api-keys')
                .expect(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].id).toBe(TEST_UUIDS.apiKey);
            expect(response.body.data[0].name).toBe('Test API Key');
            expect(response.body.data[0].keyPrefix).toBe('omni_test1234');
            expect(response.body.data[0].permissions).toEqual([
                api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ,
                api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND,
            ]);
            expect(response.body.meta.total).toBe(1);
            expect(mockApiKeyService.listKeys).toHaveBeenCalledWith(tenantId);
        });
        it('should return empty array when no keys exist', async () => {
            mockApiKeyService.listKeys.mockResolvedValue([]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/api-keys')
                .expect(200);
            expect(response.body.data).toHaveLength(0);
            expect(response.body.meta.total).toBe(0);
        });
        it('should not include key hash in response', async () => {
            mockApiKeyService.listKeys.mockResolvedValue([mockApiKeyListItem]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/api-keys')
                .expect(200);
            expect(response.body.data[0].keyHash).toBeUndefined();
        });
        it('should include channel account ID when available', async () => {
            const keyWithChannel = {
                ...mockApiKeyListItem,
                channelAccountId: TEST_UUIDS.channelAccount,
            };
            mockApiKeyService.listKeys.mockResolvedValue([keyWithChannel]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/api-keys')
                .expect(200);
            expect(response.body.data[0].channelAccountId).toBe(TEST_UUIDS.channelAccount);
            // Note: channelAccountName is null in list responses (not loaded)
            expect(response.body.data[0].channelAccountName).toBeNull();
        });
    });
    describe('POST /api/api-keys - Create API Key', () => {
        const validCreateDto = {
            name: 'New API Key',
            permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
        };
        it('should create API key with valid data and CSRF token', async () => {
            const rawKey = 'omni_abc123xyz456';
            mockApiKeyService.createApiKey.mockResolvedValue({
                rawKey,
                apiKey: mockApiKey,
            });
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send(validCreateDto)
                .expect(201);
            expect(response.body.data.id).toBe(TEST_UUIDS.apiKey);
            expect(response.body.data.name).toBe('Test API Key');
            expect(response.body.data.rawKey).toBe(rawKey);
            expect(response.body.message).toContain('Store the key securely');
            expect(mockApiKeyService.createApiKey).toHaveBeenCalledWith({
                tenantId,
                name: 'New API Key',
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
                channelAccountId: null,
                expiresAt: null,
                createdById: userId,
            });
        });
        it('should create API key with optional fields', async () => {
            const rawKey = 'omni_abc123xyz456';
            const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            mockApiKeyService.createApiKey.mockResolvedValue({
                rawKey,
                apiKey: createMockApiKey({ channelAccountId: TEST_UUIDS.channelAccount }),
            });
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'New API Key',
                permissions: [api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND],
                channelAccountId: TEST_UUIDS.channelAccount,
                expiresAt: futureDate.toISOString(),
            })
                .expect(201);
            expect(response.body.data.rawKey).toBe(rawKey);
            expect(mockApiKeyService.createApiKey).toHaveBeenCalledWith(expect.objectContaining({
                channelAccountId: TEST_UUIDS.channelAccount,
                expiresAt: expect.any(Date),
            }));
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .send(validCreateDto)
                .expect(403);
        });
        it('should return 400 for missing name', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for empty name', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: '',
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for name exceeding 100 characters', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'a'.repeat(101),
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for missing permissions', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Test Key',
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for empty permissions array', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Test Key',
                permissions: [],
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for invalid permission value', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Test Key',
                permissions: ['invalid:permission'],
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for invalid channelAccountId format', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Test Key',
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
                channelAccountId: 'not-a-uuid',
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for invalid expiration date format', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Test Key',
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
                expiresAt: 'not-a-date',
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for expiration date in the past', async () => {
            const { token, cookie } = await getCsrf();
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Test Key',
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
                expiresAt: pastDate.toISOString(),
            })
                .expect(400);
            expect(response.body.message).toContain('future');
        });
    });
    describe('DELETE /api/api-keys/:id - Revoke API Key', () => {
        it('should revoke API key successfully', async () => {
            mockApiKeyService.getKeyById.mockResolvedValue(mockApiKey);
            mockApiKeyService.revokeKey.mockResolvedValue(undefined);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(200);
            expect(response.body.data.id).toBe(TEST_UUIDS.apiKey);
            expect(response.body.data.message).toContain('revoked successfully');
            expect(mockApiKeyService.revokeKey).toHaveBeenCalledWith(tenantId, TEST_UUIDS.apiKey);
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
                .expect(403);
        });
        it('should return 404 when API key not found', async () => {
            mockApiKeyService.getKeyById.mockResolvedValue(null);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(404);
            expect(response.body.message).toContain('not found');
        });
        it('should return 404 when API key belongs to different tenant', async () => {
            // Service returns null when key doesn't belong to tenant
            // (tenant scoping is handled by the service)
            mockApiKeyService.getKeyById.mockResolvedValue(null);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(404);
            // Should return not found error
            expect(response.body.message).toContain('not found');
        });
        it('should return 400 when API key is already revoked', async () => {
            const revokedKey = createMockApiKey({ isActive: false });
            mockApiKeyService.getKeyById.mockResolvedValue(revokedKey);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(400);
            expect(response.body.message).toContain('already revoked');
        });
        it('should return 400 for invalid UUID format', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .delete('/api/api-keys/not-a-valid-uuid')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(400);
            expect(response.body.message).toContain('Invalid API key ID');
        });
    });
    describe('Tenant Isolation', () => {
        it('should only list keys from user tenant', async () => {
            mockApiKeyService.listKeys.mockResolvedValue([mockApiKeyListItem]);
            await (0, supertest_1.default)(app)
                .get('/api/api-keys')
                .expect(200);
            expect(mockApiKeyService.listKeys).toHaveBeenCalledWith(tenantId);
        });
        it('should pass tenant ID when creating key', async () => {
            const rawKey = 'omni_abc123xyz456';
            mockApiKeyService.createApiKey.mockResolvedValue({
                rawKey,
                apiKey: mockApiKey,
            });
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Test Key',
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
            })
                .expect(201);
            expect(mockApiKeyService.createApiKey).toHaveBeenCalledWith(expect.objectContaining({
                tenantId,
            }));
        });
        it('should verify tenant ownership before revoking', async () => {
            mockApiKeyService.getKeyById.mockResolvedValue(mockApiKey);
            mockApiKeyService.revokeKey.mockResolvedValue(undefined);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(200);
            // Verify the service was called with tenant ID for tenant scoping
            expect(mockApiKeyService.getKeyById).toHaveBeenCalledWith(tenantId, TEST_UUIDS.apiKey);
        });
    });
    describe('Error Handling', () => {
        it('should return 400 for user without tenant when listing', async () => {
            // Create app with no tenant middleware
            const appNoTenant = (0, express_1.default)();
            appNoTenant.use(request_context_1.requestContextMiddleware);
            appNoTenant.use(express_1.default.json());
            const controller = tsyringe_1.container.resolve(api_key_controller_1.ApiKeyController);
            appNoTenant.get('/api/api-keys', mockAuthenticate, (req, _res, next) => {
                req.tenantId = undefined;
                next();
            }, controller.listKeys);
            appNoTenant.use(testErrorHandler);
            const response = await (0, supertest_1.default)(appNoTenant)
                .get('/api/api-keys')
                .expect(400);
            expect(response.body.message).toContain('tenant');
        });
        it('should handle service errors gracefully when creating', async () => {
            mockApiKeyService.createApiKey.mockRejectedValue(new Error('Database error'));
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/api-keys')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Test Key',
                permissions: [api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ],
            })
                .expect(400);
            expect(response.body.message).toBe('Failed to create API key. Please try again.');
        });
        it('should handle service errors gracefully when revoking', async () => {
            mockApiKeyService.getKeyById.mockResolvedValue(mockApiKey);
            mockApiKeyService.revokeKey.mockRejectedValue(new Error('Database error'));
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(400);
            expect(response.body.message).toBe('Failed to revoke API key. Please try again.');
        });
    });
    describe('Response Format', () => {
        it('should format dates as ISO strings in list response', async () => {
            mockApiKeyService.listKeys.mockResolvedValue([mockApiKeyListItem]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/api-keys')
                .expect(200);
            const key = response.body.data[0];
            expect(key.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
            expect(key.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
            expect(key.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
        it('should return null for createdByName in list response', async () => {
            // Note: List responses don't include creator details since ApiKeyListItem
            // doesn't load the createdBy relation
            mockApiKeyService.listKeys.mockResolvedValue([mockApiKeyListItem]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/api-keys')
                .expect(200);
            expect(response.body.data[0].createdByName).toBeNull();
            expect(response.body.data[0].createdById).toBe(userId);
        });
        it('should return null for optional fields when not set', async () => {
            const keyWithNulls = {
                ...mockApiKeyListItem,
                expiresAt: null,
                lastUsedAt: null,
                channelAccountId: null,
            };
            mockApiKeyService.listKeys.mockResolvedValue([keyWithNulls]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/api-keys')
                .expect(200);
            const key = response.body.data[0];
            expect(key.expiresAt).toBeNull();
            expect(key.lastUsedAt).toBeNull();
            expect(key.channelAccountId).toBeNull();
            expect(key.channelAccountName).toBeNull();
        });
    });
});
