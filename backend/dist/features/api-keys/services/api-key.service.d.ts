import { ApiKeyRepository } from '../repositories/api-key.repository';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';
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
export declare class ApiKeyService {
    private readonly apiKeyRepository;
    /**
     * Key format: omni_<32 bytes as hex>
     * Total length: 5 (prefix) + 64 (hex) = 69 characters
     */
    private static readonly KEY_PREFIX;
    private static readonly KEY_BYTES;
    private static readonly PREFIX_LENGTH;
    constructor(apiKeyRepository: ApiKeyRepository);
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
    createApiKey(params: CreateApiKeyParams): Promise<CreateApiKeyResult>;
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
    validateKey(rawKey: string): Promise<ApiKey | null>;
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
    private timingSafeHashCompare;
    /**
     * Revoke (deactivate) an API key.
     *
     * @param tenantId - The tenant ID for isolation
     * @param keyId - The API key ID to revoke
     */
    revokeKey(tenantId: string, keyId: string): Promise<void>;
    /**
     * List all API keys for a tenant.
     *
     * Returns keys without sensitive data (keyHash is excluded).
     *
     * @param tenantId - The tenant ID
     * @returns Array of API key list items (without secrets)
     */
    listKeys(tenantId: string): Promise<ApiKeyListItem[]>;
    /**
     * Record API key usage.
     *
     * Updates the lastUsedAt timestamp. This is fire-and-forget;
     * errors are logged but not thrown to avoid blocking authentication.
     *
     * @param keyId - The API key ID
     */
    recordUsage(keyId: string): Promise<void>;
    /**
     * Get an API key by ID within a tenant.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The API key ID
     * @returns The API key or null if not found
     */
    getKeyById(tenantId: string, id: string): Promise<ApiKey | null>;
    /**
     * Generate a cryptographically secure random API key.
     *
     * Format: omni_<32 bytes as hex>
     * Total length: 69 characters
     */
    private generateRawKey;
    /**
     * Hash an API key using SHA-256.
     *
     * We store hashes, not raw keys, for security.
     */
    private hashKey;
}
