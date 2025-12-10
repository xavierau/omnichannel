import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';

/**
 * Parameters for creating a new API key.
 */
export interface CreateApiKeyParams {
  tenantId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: ApiKeyPermission[];
  createdById: string | null;
  channelAccountId: string | null;
  expiresAt: Date | null;
}

/**
 * Repository for ApiKey entity operations.
 *
 * Security:
 * - API keys are stored as SHA-256 hashes (hashing done in service layer)
 * - The repository never stores or returns the raw key
 * - Tenant isolation enforced on all operations except findByKeyHash
 */
@singleton()
export class ApiKeyRepository {
  private _repository: Repository<ApiKey> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<ApiKey> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(ApiKey);
    }
    return this._repository;
  }

  /**
   * Create a new API key.
   *
   * @param params - The API key creation parameters
   * @returns The created API key
   */
  async create(params: CreateApiKeyParams): Promise<ApiKey> {
    const apiKey = this.repository.create(params);
    return this.repository.save(apiKey);
  }

  /**
   * Find an API key by ID within a tenant.
   * Tenant scoping ensures data isolation between tenants.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The API key ID
   * @returns The API key or null if not found
   */
  async findById(tenantId: string, id: string): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: { id, tenantId },
      relations: ['createdBy', 'channelAccount'],
    });
  }

  /**
   * Find an API key by its SHA-256 hash.
   * NOT scoped by tenant - used during authentication when tenant is unknown.
   * Includes tenant relation for authorization checks after key validation.
   *
   * @param keyHash - The SHA-256 hash of the raw API key
   * @returns The API key or null if not found
   */
  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: { keyHash },
      relations: ['tenant', 'createdBy', 'channelAccount'],
    });
  }

  /**
   * Find all API keys for a tenant.
   * Returns keys sorted by creation date (newest first).
   *
   * @param tenantId - The tenant ID
   * @returns Array of API keys for the tenant
   */
  async findAllByTenant(tenantId: string): Promise<ApiKey[]> {
    return this.repository.find({
      where: { tenantId },
      relations: ['createdBy', 'channelAccount'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update the lastUsedAt timestamp for an API key.
   * Called asynchronously during authentication (fire-and-forget).
   *
   * @param id - The API key ID
   */
  async updateLastUsedAt(id: string): Promise<void> {
    await this.repository.update(id, {
      lastUsedAt: new Date(),
    });
  }

  /**
   * Deactivate an API key within a tenant.
   * Sets isActive to false for soft deletion.
   * Tenant scoping prevents cross-tenant key deactivation.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The API key ID
   * @returns The deactivated API key or null if not found
   */
  async deactivate(tenantId: string, id: string): Promise<ApiKey | null> {
    const apiKey = await this.repository.findOne({
      where: { id, tenantId },
    });

    if (!apiKey) {
      return null;
    }

    apiKey.isActive = false;
    return this.repository.save(apiKey);
  }

  /**
   * Check if a key hash already exists for a tenant.
   *
   * @param tenantId - The tenant ID
   * @param keyHash - The hash to check
   * @returns True if the hash exists
   */
  async existsByKeyHash(tenantId: string, keyHash: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { tenantId, keyHash },
    });
    return count > 0;
  }
}
