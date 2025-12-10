"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../../config/database.config");
const api_key_entity_1 = require("../entities/api-key.entity");
/**
 * Repository for ApiKey entity operations.
 *
 * Security:
 * - API keys are stored as SHA-256 hashes (hashing done in service layer)
 * - The repository never stores or returns the raw key
 * - Tenant isolation enforced on all operations except findByKeyHash
 */
let ApiKeyRepository = class ApiKeyRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(api_key_entity_1.ApiKey);
        }
        return this._repository;
    }
    /**
     * Create a new API key.
     *
     * @param params - The API key creation parameters
     * @returns The created API key
     */
    async create(params) {
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
    async findById(tenantId, id) {
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
    async findByKeyHash(keyHash) {
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
    async findAllByTenant(tenantId) {
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
    async updateLastUsedAt(id) {
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
    async deactivate(tenantId, id) {
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
    async existsByKeyHash(tenantId, keyHash) {
        const count = await this.repository.count({
            where: { tenantId, keyHash },
        });
        return count > 0;
    }
};
exports.ApiKeyRepository = ApiKeyRepository;
exports.ApiKeyRepository = ApiKeyRepository = __decorate([
    (0, tsyringe_1.singleton)()
], ApiKeyRepository);
