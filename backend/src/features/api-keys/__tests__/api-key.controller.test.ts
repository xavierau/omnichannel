import 'reflect-metadata';
import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { container } from 'tsyringe';
import { ApiKeyController } from '../controllers/api-key.controller';
import { ApiKeyService, CreateApiKeyResult, ApiKeyListItem } from '../services/api-key.service';

/**
 * Mock interface for ApiKeyService to satisfy TypeScript.
 */
interface MockApiKeyService {
  createApiKey: jest.Mock<Promise<CreateApiKeyResult>>;
  validateKey: jest.Mock;
  recordUsage: jest.Mock<Promise<void>>;
  revokeKey: jest.Mock<Promise<void>>;
  listKeys: jest.Mock<Promise<ApiKeyListItem[]>>;
  getKeyById: jest.Mock<Promise<ApiKey | null>>;
}
import { User, UserStatus } from '../../users/user.entity';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import {
  BadRequestException,
  NotFoundException,
} from '../../../shared/exceptions/http-exceptions';
import {
  csrfEnsureToken,
  csrfValidateToken,
  getCsrfToken,
} from '../../../middleware/csrf-protection';
import { requestContextMiddleware } from '../../../middleware/request-context';
import { validateDto } from '../../../middleware/validate-dto';

// Valid UUIDs for testing
const TEST_UUIDS = {
  tenant: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  user: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  apiKey: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  channelAccount: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
};

// Test error handler
const testErrorHandler = (
  err: { statusCode?: number; message?: string; errors?: unknown },
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
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
  let app: Application;
  let mockApiKeyService: MockApiKeyService;

  const tenantId = TEST_UUIDS.tenant;
  const userId = TEST_UUIDS.user;

  // Test fixtures
  const mockUser: User = {
    id: userId,
    tenantId,
    email: 'admin@example.com',
    passwordHash: 'hash',
    firstName: 'Admin',
    lastName: 'User',
    status: UserStatus.ACTIVE,
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
  const mockApiKeyListItem: ApiKeyListItem = {
    id: TEST_UUIDS.apiKey,
    name: 'Test API Key',
    keyPrefix: 'omni_test1234',
    permissions: [ApiKeyPermission.CONVERSATION_READ, ApiKeyPermission.MESSAGE_SEND],
    isActive: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    lastUsedAt: null,
    createdAt: new Date(),
    channelAccountId: null,
    createdById: userId,
  };

  // Helper to create full ApiKey with entity methods
  const createMockApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => {
    const baseKey: ApiKey = {
      id: TEST_UUIDS.apiKey,
      tenantId,
      channelAccountId: null,
      channelAccount: null,
      name: 'Test API Key',
      keyHash: 'hashed_key_value',
      keyPrefix: 'omni_test1234',
      permissions: [ApiKeyPermission.CONVERSATION_READ, ApiKeyPermission.MESSAGE_SEND],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastUsedAt: null,
      isActive: true,
      createdById: userId,
      createdBy: mockUser,
      tenant: null as never,
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
  const mockAuthenticate = (req: Request, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    next();
  };

  // Mock tenant middleware
  const mockRequireTenant = (req: Request, _res: Response, next: NextFunction) => {
    req.tenantId = tenantId;
    next();
  };

  beforeEach(() => {
    // Reset container
    container.clearInstances();

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
    container.registerInstance(ApiKeyService, mockApiKeyService as unknown as ApiKeyService);

    // Create test app
    app = express();
    app.use(requestContextMiddleware);
    app.use(express.json());
    app.use(cookieParser());

    // CSRF token endpoint
    app.get('/csrf-token', csrfEnsureToken, (req, res) => {
      res.json({ csrfToken: getCsrfToken(req) });
    });

    // Create controller
    const controller = container.resolve(ApiKeyController);

    // Routes
    app.get(
      '/api/api-keys',
      mockAuthenticate,
      mockRequireTenant,
      controller.listKeys
    );

    app.post(
      '/api/api-keys',
      mockAuthenticate,
      mockRequireTenant,
      csrfValidateToken,
      validateDto(CreateApiKeyDto),
      controller.createKey
    );

    app.delete(
      '/api/api-keys/:id',
      mockAuthenticate,
      mockRequireTenant,
      csrfValidateToken,
      controller.revokeKey
    );

    // Error handler
    app.use(testErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to get CSRF token
  const getCsrf = async () => {
    const response = await request(app).get('/csrf-token');
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

      const response = await request(app)
        .get('/api/api-keys')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(TEST_UUIDS.apiKey);
      expect(response.body.data[0].name).toBe('Test API Key');
      expect(response.body.data[0].keyPrefix).toBe('omni_test1234');
      expect(response.body.data[0].permissions).toEqual([
        ApiKeyPermission.CONVERSATION_READ,
        ApiKeyPermission.MESSAGE_SEND,
      ]);
      expect(response.body.meta.total).toBe(1);

      expect(mockApiKeyService.listKeys).toHaveBeenCalledWith(tenantId);
    });

    it('should return empty array when no keys exist', async () => {
      mockApiKeyService.listKeys.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/api-keys')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.total).toBe(0);
    });

    it('should not include key hash in response', async () => {
      mockApiKeyService.listKeys.mockResolvedValue([mockApiKeyListItem]);

      const response = await request(app)
        .get('/api/api-keys')
        .expect(200);

      expect(response.body.data[0].keyHash).toBeUndefined();
    });

    it('should include channel account ID when available', async () => {
      const keyWithChannel: ApiKeyListItem = {
        ...mockApiKeyListItem,
        channelAccountId: TEST_UUIDS.channelAccount,
      };
      mockApiKeyService.listKeys.mockResolvedValue([keyWithChannel]);

      const response = await request(app)
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
      permissions: [ApiKeyPermission.CONVERSATION_READ],
    };

    it('should create API key with valid data and CSRF token', async () => {
      const rawKey = 'omni_abc123xyz456';
      mockApiKeyService.createApiKey.mockResolvedValue({
        rawKey,
        apiKey: mockApiKey,
      });

      const { token, cookie } = await getCsrf();

      const response = await request(app)
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
        permissions: [ApiKeyPermission.CONVERSATION_READ],
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

      const response = await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'New API Key',
          permissions: [ApiKeyPermission.MESSAGE_SEND],
          channelAccountId: TEST_UUIDS.channelAccount,
          expiresAt: futureDate.toISOString(),
        })
        .expect(201);

      expect(response.body.data.rawKey).toBe(rawKey);
      expect(mockApiKeyService.createApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          channelAccountId: TEST_UUIDS.channelAccount,
          expiresAt: expect.any(Date),
        })
      );
    });

    it('should reject without CSRF token', async () => {
      await request(app)
        .post('/api/api-keys')
        .send(validCreateDto)
        .expect(403);
    });

    it('should return 400 for missing name', async () => {
      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          permissions: [ApiKeyPermission.CONVERSATION_READ],
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 for empty name', async () => {
      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: '',
          permissions: [ApiKeyPermission.CONVERSATION_READ],
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 for name exceeding 100 characters', async () => {
      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'a'.repeat(101),
          permissions: [ApiKeyPermission.CONVERSATION_READ],
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 for missing permissions', async () => {
      const { token, cookie } = await getCsrf();

      const response = await request(app)
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

      const response = await request(app)
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

      const response = await request(app)
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

      const response = await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Test Key',
          permissions: [ApiKeyPermission.CONVERSATION_READ],
          channelAccountId: 'not-a-uuid',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 for invalid expiration date format', async () => {
      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Test Key',
          permissions: [ApiKeyPermission.CONVERSATION_READ],
          expiresAt: 'not-a-date',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 for expiration date in the past', async () => {
      const { token, cookie } = await getCsrf();
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Test Key',
          permissions: [ApiKeyPermission.CONVERSATION_READ],
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

      const response = await request(app)
        .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .expect(200);

      expect(response.body.data.id).toBe(TEST_UUIDS.apiKey);
      expect(response.body.data.message).toContain('revoked successfully');
      expect(mockApiKeyService.revokeKey).toHaveBeenCalledWith(tenantId, TEST_UUIDS.apiKey);
    });

    it('should reject without CSRF token', async () => {
      await request(app)
        .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
        .expect(403);
    });

    it('should return 404 when API key not found', async () => {
      mockApiKeyService.getKeyById.mockResolvedValue(null);

      const { token, cookie } = await getCsrf();

      const response = await request(app)
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

      const response = await request(app)
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

      const response = await request(app)
        .delete(`/api/api-keys/${TEST_UUIDS.apiKey}`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .expect(400);

      expect(response.body.message).toContain('already revoked');
    });

    it('should return 400 for invalid UUID format', async () => {
      const { token, cookie } = await getCsrf();

      const response = await request(app)
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

      await request(app)
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

      await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Test Key',
          permissions: [ApiKeyPermission.CONVERSATION_READ],
        })
        .expect(201);

      expect(mockApiKeyService.createApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
        })
      );
    });

    it('should verify tenant ownership before revoking', async () => {
      mockApiKeyService.getKeyById.mockResolvedValue(mockApiKey);
      mockApiKeyService.revokeKey.mockResolvedValue(undefined);

      const { token, cookie } = await getCsrf();

      await request(app)
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
      const appNoTenant = express();
      appNoTenant.use(requestContextMiddleware);
      appNoTenant.use(express.json());

      const controller = container.resolve(ApiKeyController);

      appNoTenant.get('/api/api-keys', mockAuthenticate, (req, _res, next) => {
        req.tenantId = undefined;
        next();
      }, controller.listKeys);

      appNoTenant.use(testErrorHandler);

      const response = await request(appNoTenant)
        .get('/api/api-keys')
        .expect(400);

      expect(response.body.message).toContain('tenant');
    });

    it('should handle service errors gracefully when creating', async () => {
      mockApiKeyService.createApiKey.mockRejectedValue(new Error('Database error'));

      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .post('/api/api-keys')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Test Key',
          permissions: [ApiKeyPermission.CONVERSATION_READ],
        })
        .expect(400);

      expect(response.body.message).toBe('Failed to create API key. Please try again.');
    });

    it('should handle service errors gracefully when revoking', async () => {
      mockApiKeyService.getKeyById.mockResolvedValue(mockApiKey);
      mockApiKeyService.revokeKey.mockRejectedValue(new Error('Database error'));

      const { token, cookie } = await getCsrf();

      const response = await request(app)
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

      const response = await request(app)
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

      const response = await request(app)
        .get('/api/api-keys')
        .expect(200);

      expect(response.body.data[0].createdByName).toBeNull();
      expect(response.body.data[0].createdById).toBe(userId);
    });

    it('should return null for optional fields when not set', async () => {
      const keyWithNulls: ApiKeyListItem = {
        ...mockApiKeyListItem,
        expiresAt: null,
        lastUsedAt: null,
        channelAccountId: null,
      };
      mockApiKeyService.listKeys.mockResolvedValue([keyWithNulls]);

      const response = await request(app)
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
