"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const media_entity_1 = require("./media.entity");
/**
 * Repository for Media entity operations
 *
 * Handles all database operations for media records.
 * All operations are tenant-scoped for multi-tenancy security.
 */
let MediaRepository = class MediaRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(media_entity_1.Media);
        }
        return this._repository;
    }
    /**
     * Creates a new media record
     *
     * @param data - Media creation data
     * @returns Created media record
     */
    async create(data) {
        const media = this.repository.create(data);
        return this.repository.save(media);
    }
    /**
     * Finds a media record by ID within a tenant
     *
     * @param id - Media UUID
     * @param tenantId - Tenant UUID for scoping
     * @returns Media record or null if not found
     */
    async findById(id, tenantId) {
        return this.repository.findOne({
            where: { id, tenantId },
        });
    }
    /**
     * Deletes a media record by ID within a tenant
     *
     * @param id - Media UUID
     * @param tenantId - Tenant UUID for scoping
     * @returns True if record was deleted, false if not found
     */
    async delete(id, tenantId) {
        const result = await this.repository.delete({ id, tenantId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Finds all media records for a tenant
     *
     * @param tenantId - Tenant UUID for scoping
     * @param limit - Maximum number of records to return
     * @param offset - Number of records to skip
     * @returns Array of media records
     */
    async findByTenant(tenantId, limit = 50, offset = 0) {
        return this.repository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
    /**
     * Counts total media records for a tenant
     *
     * @param tenantId - Tenant UUID for scoping
     * @returns Count of media records
     */
    async countByTenant(tenantId) {
        return this.repository.count({
            where: { tenantId },
        });
    }
    /**
     * Finds media records by type for a tenant
     *
     * @param tenantId - Tenant UUID for scoping
     * @param type - Media type filter
     * @returns Array of media records
     */
    async findByType(tenantId, type) {
        return this.repository.find({
            where: { tenantId, type },
            order: { createdAt: 'DESC' },
        });
    }
};
exports.MediaRepository = MediaRepository;
exports.MediaRepository = MediaRepository = __decorate([
    (0, tsyringe_1.singleton)()
], MediaRepository);
