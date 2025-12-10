import { inject, singleton } from 'tsyringe';
import * as crypto from 'crypto';
import { timingSafeEqual } from 'crypto';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';
import { auditLogger } from '@config/logger.config';

/**
 * Parameters for creating a new API key.
 */
export interface CreateApiKeyParams {
  tenantId: string;
  name: string;
  permissions: ApiKeyPermission[];
  createdById: string | null;
  channelAccountId: string | null;
  expiresAt: Date | null;
}

/**
 * Result of creating an API key.
 * Contains both the raw key (only shown once) and the persisted entity.
 */
export interface CreateApiKeyResult {
  rawKey: string;
  apiKey: ApiKey;
}

/**
 * API key item for list responses.
 * Excludes sensitive data like keyHash.
 */
export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: ApiKeyPermission[];
  isActive: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  channelAccountId: string | null;
  createdById: string | null;
}

/**
 * Service for API key operations.
 *
 * Security design:
 * - Raw keys are generated using crypto.randomBytes (CSPRNG)
 * - Keys are hashed with SHA-256 before storage
 * - Raw keys are only returned once during creation
 * - List operations exclude sensitive data (keyHash)
 */
@singleton()
export class ApiKeyService {
  /**
   * Key format: omni_<32 bytes as hex>
   * Total length: 5 (prefix) + 64 (hex) = 69 characters
   */
  private static readonly KEY_PREFIX = 'omni_';
  private static readonly KEY_BYTES = 32;
  private static readonly PREFIX_LENGTH = 12;

  constructor(
    @inject(ApiKeyRepository)
    private readonly apiKeyRepository: ApiKeyRepository
  ) {}

  /**
   * Create a new API key.
   *
   * Security:
   * - Generates cryptographically secure random key
   * - Stores only the SHA-256 hash
   * - Raw key is returned only once and never stored
   *
   * @param params - The API key creation parameters
   * @returns Object containing the raw key (show once!) and persisted entity
   */
  async createApiKey(params: CreateApiKeyParams): Promise<CreateApiKeyResult> {
    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, ApiKeyService.PREFIX_LENGTH);

    const apiKey = await this.apiKeyRepository.create({
      tenantId: params.tenantId,
      name: params.name,
      keyHash,
      keyPrefix,
      permissions: params.permissions,
      channelAccountId: params.channelAccountId,
      expiresAt: params.expiresAt,
      createdById: params.createdById,
    });

    auditLogger.info('API key created', {
      action: 'api_key.create',
      tenantId: params.tenantId,
      apiKeyId: apiKey.id,
      keyPrefix,
      name: params.name,
      createdById: params.createdById,
    });

    return { rawKey, apiKey };
  }

  /**
   * Validate an API key.
   *
   * Security:
   * - Uses timing-safe comparison to prevent timing attacks
   * - Hash comparison uses crypto.timingSafeEqual for constant-time comparison
   * - Invalid keys result in the same timing as valid keys to prevent enumeration
   *
   * @param rawKey - The raw API key to validate
   * @returns The API key entity if valid, null otherwise
   */
  async validateKey(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey || typeof rawKey !== 'string') {
      return null;
    }

    // Validate key format before expensive operations
    if (!rawKey.startsWith(ApiKeyService.KEY_PREFIX)) {
      return null;
    }

    const keyHash = this.hashKey(rawKey);
    const apiKey = await this.apiKeyRepository.findByKeyHash(keyHash);

    if (!apiKey) {
      return null;
    }

    // Perform timing-safe comparison of the hash
    // This prevents timing attacks that could leak information about valid keys
    if (!this.timingSafeHashCompare(keyHash, apiKey.keyHash)) {
      return null;
    }

    if (!apiKey.isValid()) {
      return null;
    }

    return apiKey;
  }

  /**
   * Perform a timing-safe comparison of two hash strings.
   *
   * Uses crypto.timingSafeEqual to prevent timing attacks.
   * Returns false if hashes have different lengths (though SHA-256 hashes
   * should always be 64 hex characters).
   *
   * @param computedHash - The hash computed from the provided key
   * @param storedHash - The hash stored in the database
   * @returns True if hashes match, false otherwise
   */
  private timingSafeHashCompare(computedHash: string, storedHash: string): boolean {
    try {
      const computedHashBuffer = Buffer.from(computedHash, 'hex');
      const storedHashBuffer = Buffer.from(storedHash, 'hex');

      // Buffers must have the same length for timingSafeEqual
      if (computedHashBuffer.length !== storedHashBuffer.length) {
        return false;
      }

      return timingSafeEqual(computedHashBuffer, storedHashBuffer);
    } catch {
      // If buffer conversion fails (malformed hex), return false
      return false;
    }
  }

  /**
   * Revoke (deactivate) an API key.
   *
   * @param tenantId - The tenant ID for isolation
   * @param keyId - The API key ID to revoke
   */
  async revokeKey(tenantId: string, keyId: string): Promise<void> {
    const result = await this.apiKeyRepository.deactivate(tenantId, keyId);

    if (result) {
      auditLogger.info('API key revoked', {
        action: 'api_key.revoke',
        tenantId,
        apiKeyId: keyId,
      });
    }
  }

  /**
   * List all API keys for a tenant.
   *
   * Returns keys without sensitive data (keyHash is excluded).
   *
   * @param tenantId - The tenant ID
   * @returns Array of API key list items (without secrets)
   */
  async listKeys(tenantId: string): Promise<ApiKeyListItem[]> {
    const apiKeys = await this.apiKeyRepository.findAllByTenant(tenantId);

    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      channelAccountId: key.channelAccountId,
      createdById: key.createdById,
    }));
  }

  /**
   * Record API key usage.
   *
   * Updates the lastUsedAt timestamp. This is fire-and-forget;
   * errors are logged but not thrown to avoid blocking authentication.
   *
   * @param keyId - The API key ID
   */
  async recordUsage(keyId: string): Promise<void> {
    try {
      await this.apiKeyRepository.updateLastUsedAt(keyId);
    } catch (error) {
      // Fire-and-forget: log error but don't throw
      auditLogger.error('Failed to record API key usage', {
        action: 'api_key.record_usage',
        apiKeyId: keyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get an API key by ID within a tenant.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The API key ID
   * @returns The API key or null if not found
   */
  async getKeyById(tenantId: string, id: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findById(tenantId, id);
  }

  /**
   * Generate a cryptographically secure random API key.
   *
   * Format: omni_<32 bytes as hex>
   * Total length: 69 characters
   */
  private generateRawKey(): string {
    const randomBytes = crypto.randomBytes(ApiKeyService.KEY_BYTES);
    const hexKey = randomBytes.toString('hex');
    return `${ApiKeyService.KEY_PREFIX}${hexKey}`;
  }

  /**
   * Hash an API key using SHA-256.
   *
   * We store hashes, not raw keys, for security.
   */
  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }
}
