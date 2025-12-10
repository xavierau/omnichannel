import 'reflect-metadata';
import { Repository, UpdateResult } from 'typeorm';
import { ApiKeyRepository, CreateApiKeyParams } from '../repositories/api-key.repository';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';

// Mock the database config
jest.mock('@config/database.config', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AppDataSource } from '@config/database.config';

describe('ApiKeyRepository', () => {
  let repository: ApiKeyRepository;
  let mockTypeOrmRepo: jest.Mocked<Repository<ApiKey>>;

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
      keyPrefix: 'omni_abc123',
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

  const mockApiKey = createMockApiKey();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock TypeORM repository
    mockTypeOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<ApiKey>>;

    // Setup AppDataSource mock
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTypeOrmRepo);

    // Create repository instance
    repository = new ApiKeyRepository();
  });

  describe('create', () => {
    it('should create a new API key with all required fields', async () => {
      const createParams = {
        tenantId,
        name: 'Test API Key',
        keyHash: 'abc123hash456',
        keyPrefix: 'omni_abc123',
        permissions: [ApiKeyPermission.MESSAGE_SEND],
        createdById: userId,
        channelAccountId: null,
        expiresAt: null,
      };

      mockTypeOrmRepo.create.mockReturnValue(mockApiKey);
      mockTypeOrmRepo.save.mockResolvedValue(mockApiKey);

      const result = await repository.create(createParams);

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(createParams);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(mockApiKey);
      expect(result).toEqual(mockApiKey);
    });

    it('should create an API key with expiration date', async () => {
      const expiresAt = new Date('2025-01-01');
      const createParams = {
        tenantId,
        name: 'Expiring Key',
        keyHash: 'hash123',
        keyPrefix: 'omni_expire',
        permissions: [ApiKeyPermission.CONVERSATION_READ],
        createdById: userId,
        channelAccountId: null,
        expiresAt,
      };

      const expiringKey = { ...mockApiKey, expiresAt };
      mockTypeOrmRepo.create.mockReturnValue(expiringKey as ApiKey);
      mockTypeOrmRepo.save.mockResolvedValue(expiringKey as ApiKey);

      const result = await repository.create(createParams);

      expect(result.expiresAt).toEqual(expiresAt);
    });

    it('should create an API key scoped to a channel account', async () => {
      const channelAccountId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
      const createParams = {
        tenantId,
        name: 'Channel Scoped Key',
        keyHash: 'hash123',
        keyPrefix: 'omni_channel',
        permissions: [ApiKeyPermission.MESSAGE_SEND],
        createdById: userId,
        channelAccountId,
        expiresAt: null,
      };

      const scopedKey = { ...mockApiKey, channelAccountId };
      mockTypeOrmRepo.create.mockReturnValue(scopedKey as ApiKey);
      mockTypeOrmRepo.save.mockResolvedValue(scopedKey as ApiKey);

      const result = await repository.create(createParams);

      expect(result.channelAccountId).toEqual(channelAccountId);
    });
  });

  describe('findById', () => {
    it('should find an API key by id within a tenant', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(mockApiKey);

      const result = await repository.findById(tenantId, apiKeyId);

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId, tenantId },
        relations: ['createdBy', 'channelAccount'],
      });
      expect(result).toEqual(mockApiKey);
    });

    it('should return null if API key not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(tenantId, 'non-existent-id');

      expect(result).toBeNull();
    });

    it('should not find API key from different tenant', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const differentTenantId = 'different-tenant-id';
      const result = await repository.findById(differentTenantId, apiKeyId);

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId, tenantId: differentTenantId },
        relations: ['createdBy', 'channelAccount'],
      });
      expect(result).toBeNull();
    });
  });

  describe('findByKeyHash', () => {
    it('should find an API key by hash without tenant scoping', async () => {
      const keyHash = 'abc123hash456';
      mockTypeOrmRepo.findOne.mockResolvedValue(mockApiKey);

      const result = await repository.findByKeyHash(keyHash);

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { keyHash },
        relations: ['tenant', 'createdBy', 'channelAccount'],
      });
      expect(result).toEqual(mockApiKey);
    });

    it('should return null if hash not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByKeyHash('non-existent-hash');

      expect(result).toBeNull();
    });
  });

  describe('findAllByTenant', () => {
    it('should find all API keys for a tenant', async () => {
      const apiKeys = [mockApiKey, { ...mockApiKey, id: 'second-key' }];
      mockTypeOrmRepo.find.mockResolvedValue(apiKeys as ApiKey[]);

      const result = await repository.findAllByTenant(tenantId);

      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { tenantId },
        relations: ['createdBy', 'channelAccount'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(apiKeys);
    });

    it('should return empty array if no keys exist', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);

      const result = await repository.findAllByTenant(tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('updateLastUsedAt', () => {
    it('should update the lastUsedAt timestamp', async () => {
      const updateResult: UpdateResult = {
        affected: 1,
        raw: [],
        generatedMaps: [],
      };
      mockTypeOrmRepo.update.mockResolvedValue(updateResult);

      const beforeUpdate = new Date();
      await repository.updateLastUsedAt(apiKeyId);
      const afterUpdate = new Date();

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(
        apiKeyId,
        expect.objectContaining({
          lastUsedAt: expect.any(Date),
        })
      );

      // Verify the date is within expected range
      const updateCall = mockTypeOrmRepo.update.mock.calls[0];
      const updatedDate = (updateCall[1] as { lastUsedAt: Date }).lastUsedAt;
      expect(updatedDate.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(updatedDate.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });
  });

  describe('deactivate', () => {
    it('should deactivate an API key within a tenant', async () => {
      const deactivatedKey = { ...mockApiKey, isActive: false };
      mockTypeOrmRepo.findOne.mockResolvedValue(mockApiKey);
      mockTypeOrmRepo.save.mockResolvedValue(deactivatedKey as ApiKey);

      const result = await repository.deactivate(tenantId, apiKeyId);

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId, tenantId },
      });
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
      expect(result).toEqual(deactivatedKey);
    });

    it('should return null if API key not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.deactivate(tenantId, 'non-existent-id');

      expect(result).toBeNull();
      expect(mockTypeOrmRepo.save).not.toHaveBeenCalled();
    });

    it('should not deactivate API key from different tenant', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const differentTenantId = 'different-tenant-id';
      const result = await repository.deactivate(differentTenantId, apiKeyId);

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId, tenantId: differentTenantId },
      });
      expect(result).toBeNull();
    });
  });
});
