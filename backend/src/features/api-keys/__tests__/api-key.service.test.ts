import 'reflect-metadata';
import * as crypto from 'crypto';
import { ApiKeyService, CreateApiKeyResult, ApiKeyListItem } from '../services/api-key.service';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';

// Mock the logger
jest.mock('@config/logger.config', () => ({
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

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockRepository: jest.Mocked<ApiKeyRepository>;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const apiKeyId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const userId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  const createMockApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => {
    const base = {
      id: apiKeyId,
      tenantId,
      channelAccountId: null,
      channelAccount: null,
      name: 'Test API Key',
      keyHash: 'abc123hash456',
      keyPrefix: 'omni_abc123de',
      permissions: [ApiKeyPermission.MESSAGE_SEND],
      expiresAt: null,
      lastUsedAt: null,
      isActive: true,
      createdById: userId,
      createdBy: null,
      tenant: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isValid: jest.fn().mockReturnValue(true),
      isExpired: jest.fn().mockReturnValue(false),
      hasPermission: jest.fn().mockReturnValue(true),
      hasAllPermissions: jest.fn().mockReturnValue(true),
      hasAnyPermission: jest.fn().mockReturnValue(true),
      ...overrides,
    };
    return base as unknown as ApiKey;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByKeyHash: jest.fn(),
      findAllByTenant: jest.fn(),
      updateLastUsedAt: jest.fn(),
      deactivate: jest.fn(),
      existsByKeyHash: jest.fn(),
    } as unknown as jest.Mocked<ApiKeyRepository>;

    service = new ApiKeyService(mockRepository);
  });

  describe('createApiKey', () => {
    const createParams = {
      tenantId,
      name: 'Test API Key',
      permissions: [ApiKeyPermission.MESSAGE_SEND],
      createdById: userId,
      channelAccountId: null,
      expiresAt: null,
    };

    it('should generate a key with the correct format (omni_ prefix + 32 bytes hex)', async () => {
      const mockApiKey = createMockApiKey();
      mockRepository.create.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey(createParams);

      // Key format: omni_ (5 chars) + 64 hex chars (32 bytes) = 69 chars total
      expect(result.rawKey).toMatch(/^omni_[a-f0-9]{64}$/);
      expect(result.rawKey.length).toBe(69);
    });

    it('should store the SHA-256 hash of the raw key, not the key itself', async () => {
      const mockApiKey = createMockApiKey();
      mockRepository.create.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey(createParams);

      // Verify hash was computed correctly
      const expectedHash = crypto
        .createHash('sha256')
        .update(result.rawKey)
        .digest('hex');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          keyHash: expectedHash,
        })
      );
    });

    it('should store the first 12 characters as prefix', async () => {
      const mockApiKey = createMockApiKey();
      mockRepository.create.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey(createParams);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          keyPrefix: result.rawKey.substring(0, 12),
        })
      );
    });

    it('should return both the raw key and API key entity', async () => {
      const mockApiKey = createMockApiKey();
      mockRepository.create.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey(createParams);

      expect(result.rawKey).toBeDefined();
      expect(result.apiKey).toEqual(mockApiKey);
    });

    it('should create an API key with expiration date', async () => {
      const expiresAt = new Date('2025-12-31');
      const mockApiKey = createMockApiKey({ expiresAt });
      mockRepository.create.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey({
        ...createParams,
        expiresAt,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt,
        })
      );
      expect(result.apiKey.expiresAt).toEqual(expiresAt);
    });

    it('should create an API key scoped to a channel account', async () => {
      const channelAccountId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
      const mockApiKey = createMockApiKey({ channelAccountId });
      mockRepository.create.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey({
        ...createParams,
        channelAccountId,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channelAccountId,
        })
      );
      expect(result.apiKey.channelAccountId).toEqual(channelAccountId);
    });
  });

  describe('validateKey', () => {
    it('should return the API key if valid and active', async () => {
      const rawKey = 'omni_' + 'a'.repeat(64);
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const mockApiKey = createMockApiKey({
        keyHash,
        isActive: true,
        isValid: jest.fn().mockReturnValue(true),
      });
      mockRepository.findByKeyHash.mockResolvedValue(mockApiKey);

      const result = await service.validateKey(rawKey);

      expect(result).toEqual(mockApiKey);
      expect(mockRepository.findByKeyHash).toHaveBeenCalledWith(keyHash);
    });

    it('should return null if key is not found', async () => {
      mockRepository.findByKeyHash.mockResolvedValue(null);

      const result = await service.validateKey('omni_nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if key is inactive', async () => {
      const rawKey = 'omni_' + 'a'.repeat(64);
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const mockApiKey = createMockApiKey({
        keyHash,
        isActive: false,
        isValid: jest.fn().mockReturnValue(false),
      });
      mockRepository.findByKeyHash.mockResolvedValue(mockApiKey);

      const result = await service.validateKey(rawKey);

      expect(result).toBeNull();
    });

    it('should return null if key is expired', async () => {
      const rawKey = 'omni_' + 'a'.repeat(64);
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const expiredDate = new Date('2020-01-01');
      const mockApiKey = createMockApiKey({
        keyHash,
        expiresAt: expiredDate,
        isValid: jest.fn().mockReturnValue(false),
      });
      mockRepository.findByKeyHash.mockResolvedValue(mockApiKey);

      const result = await service.validateKey(rawKey);

      expect(result).toBeNull();
    });

    it('should hash the raw key using SHA-256', async () => {
      const rawKey = 'omni_' + 'b'.repeat(64);
      const expectedHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      mockRepository.findByKeyHash.mockResolvedValue(null);

      await service.validateKey(rawKey);

      expect(mockRepository.findByKeyHash).toHaveBeenCalledWith(expectedHash);
    });
  });

  describe('revokeKey', () => {
    it('should deactivate the key by tenant and id', async () => {
      const mockApiKey = createMockApiKey({ isActive: false });
      mockRepository.deactivate.mockResolvedValue(mockApiKey);

      await service.revokeKey(tenantId, apiKeyId);

      expect(mockRepository.deactivate).toHaveBeenCalledWith(tenantId, apiKeyId);
    });

    it('should not throw if key is not found', async () => {
      mockRepository.deactivate.mockResolvedValue(null);

      // Should not throw
      await expect(service.revokeKey(tenantId, 'non-existent-id')).resolves.toBeUndefined();
    });
  });

  describe('listKeys', () => {
    it('should return all keys for a tenant without sensitive data', async () => {
      const mockApiKeys = [
        createMockApiKey({ id: 'key-1', name: 'Key 1' }),
        createMockApiKey({ id: 'key-2', name: 'Key 2' }),
      ];
      mockRepository.findAllByTenant.mockResolvedValue(mockApiKeys);

      const result = await service.listKeys(tenantId);

      expect(mockRepository.findAllByTenant).toHaveBeenCalledWith(tenantId);
      expect(result).toHaveLength(2);

      // Verify sensitive data is not exposed (keyHash should not be in the result)
      result.forEach((key: ApiKeyListItem) => {
        expect(key.id).toBeDefined();
        expect(key.name).toBeDefined();
        expect(key.keyPrefix).toBeDefined();
        expect(key.isActive).toBeDefined();
        expect((key as unknown as { keyHash?: string }).keyHash).toBeUndefined();
      });
    });

    it('should return empty array if no keys exist', async () => {
      mockRepository.findAllByTenant.mockResolvedValue([]);

      const result = await service.listKeys(tenantId);

      expect(result).toEqual([]);
    });

    it('should include key metadata in response', async () => {
      const mockApiKey = createMockApiKey({
        lastUsedAt: new Date('2024-06-15'),
        expiresAt: new Date('2025-01-01'),
      });
      mockRepository.findAllByTenant.mockResolvedValue([mockApiKey]);

      const result = await service.listKeys(tenantId);

      expect(result[0]).toMatchObject({
        id: mockApiKey.id,
        name: mockApiKey.name,
        keyPrefix: mockApiKey.keyPrefix,
        permissions: mockApiKey.permissions,
        isActive: mockApiKey.isActive,
        expiresAt: mockApiKey.expiresAt,
        lastUsedAt: mockApiKey.lastUsedAt,
        createdAt: mockApiKey.createdAt,
      });
    });
  });

  describe('recordUsage', () => {
    it('should update the lastUsedAt timestamp', async () => {
      mockRepository.updateLastUsedAt.mockResolvedValue();

      await service.recordUsage(apiKeyId);

      expect(mockRepository.updateLastUsedAt).toHaveBeenCalledWith(apiKeyId);
    });

    it('should not throw on repository errors (fire-and-forget)', async () => {
      mockRepository.updateLastUsedAt.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.recordUsage(apiKeyId)).resolves.toBeUndefined();
    });
  });

  describe('key generation security', () => {
    it('should generate unique keys on each call', async () => {
      const mockApiKey = createMockApiKey();
      mockRepository.create.mockResolvedValue(mockApiKey);

      const results = await Promise.all([
        service.createApiKey({
          tenantId,
          name: 'Key 1',
          permissions: [ApiKeyPermission.MESSAGE_SEND],
          createdById: userId,
          channelAccountId: null,
          expiresAt: null,
        }),
        service.createApiKey({
          tenantId,
          name: 'Key 2',
          permissions: [ApiKeyPermission.MESSAGE_SEND],
          createdById: userId,
          channelAccountId: null,
          expiresAt: null,
        }),
      ]);

      expect(results[0].rawKey).not.toEqual(results[1].rawKey);
    });

it('should generate keys with sufficient entropy', async () => {
      // Generate multiple keys and verify they're all unique and correct format
      // This indirectly verifies crypto.randomBytes is being used
      const mockApiKey = createMockApiKey();
      mockRepository.create.mockResolvedValue(mockApiKey);

      const keys = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const result = await service.createApiKey({
          tenantId,
          name: `Test Key ${i}`,
          permissions: [ApiKeyPermission.MESSAGE_SEND],
          createdById: userId,
          channelAccountId: null,
          expiresAt: null,
        });

        // Verify format: omni_ + 64 hex chars
        expect(result.rawKey).toMatch(/^omni_[a-f0-9]{64}$/);
        expect(keys.has(result.rawKey)).toBe(false);
        keys.add(result.rawKey);
      }

      expect(keys.size).toBe(10);
    });
  });
});
