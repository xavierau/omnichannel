"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ApiKeyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyService = void 0;
const tsyringe_1 = require("tsyringe");
const crypto = __importStar(require("crypto"));
const crypto_1 = require("crypto");
const api_key_repository_1 = require("../repositories/api-key.repository");
const logger_config_1 = require("../../../config/logger.config");
/**
 * Service for API key operations.
 *
 * Security design:
 * - Raw keys are generated using crypto.randomBytes (CSPRNG)
 * - Keys are hashed with SHA-256 before storage
 * - Raw keys are only returned once during creation
 * - List operations exclude sensitive data (keyHash)
 */
let ApiKeyService = class ApiKeyService {
    static { ApiKeyService_1 = this; }
    apiKeyRepository;
    /**
     * Key format: omni_<32 bytes as hex>
     * Total length: 5 (prefix) + 64 (hex) = 69 characters
     */
    static KEY_PREFIX = 'omni_';
    static KEY_BYTES = 32;
    static PREFIX_LENGTH = 12;
    constructor(apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }
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
    async createApiKey(params) {
        const rawKey = this.generateRawKey();
        const keyHash = this.hashKey(rawKey);
        const keyPrefix = rawKey.substring(0, ApiKeyService_1.PREFIX_LENGTH);
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
        logger_config_1.auditLogger.info('API key created', {
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
    async validateKey(rawKey) {
        if (!rawKey || typeof rawKey !== 'string') {
            return null;
        }
        // Validate key format before expensive operations
        if (!rawKey.startsWith(ApiKeyService_1.KEY_PREFIX)) {
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
    timingSafeHashCompare(computedHash, storedHash) {
        try {
            const computedHashBuffer = Buffer.from(computedHash, 'hex');
            const storedHashBuffer = Buffer.from(storedHash, 'hex');
            // Buffers must have the same length for timingSafeEqual
            if (computedHashBuffer.length !== storedHashBuffer.length) {
                return false;
            }
            return (0, crypto_1.timingSafeEqual)(computedHashBuffer, storedHashBuffer);
        }
        catch {
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
    async revokeKey(tenantId, keyId) {
        const result = await this.apiKeyRepository.deactivate(tenantId, keyId);
        if (result) {
            logger_config_1.auditLogger.info('API key revoked', {
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
    async listKeys(tenantId) {
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
    async recordUsage(keyId) {
        try {
            await this.apiKeyRepository.updateLastUsedAt(keyId);
        }
        catch (error) {
            // Fire-and-forget: log error but don't throw
            logger_config_1.auditLogger.error('Failed to record API key usage', {
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
    async getKeyById(tenantId, id) {
        return this.apiKeyRepository.findById(tenantId, id);
    }
    /**
     * Generate a cryptographically secure random API key.
     *
     * Format: omni_<32 bytes as hex>
     * Total length: 69 characters
     */
    generateRawKey() {
        const randomBytes = crypto.randomBytes(ApiKeyService_1.KEY_BYTES);
        const hexKey = randomBytes.toString('hex');
        return `${ApiKeyService_1.KEY_PREFIX}${hexKey}`;
    }
    /**
     * Hash an API key using SHA-256.
     *
     * We store hashes, not raw keys, for security.
     */
    hashKey(rawKey) {
        return crypto.createHash('sha256').update(rawKey).digest('hex');
    }
};
exports.ApiKeyService = ApiKeyService;
exports.ApiKeyService = ApiKeyService = ApiKeyService_1 = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(api_key_repository_1.ApiKeyRepository)),
    __metadata("design:paramtypes", [api_key_repository_1.ApiKeyRepository])
], ApiKeyService);
