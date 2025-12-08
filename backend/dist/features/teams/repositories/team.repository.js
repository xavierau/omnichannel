"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("@config/database.config");
const team_entity_1 = require("../entities/team.entity");
/**
 * Repository for Team entity operations.
 * Handles CRUD operations with tenant isolation.
 */
let TeamRepository = class TeamRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(team_entity_1.Team);
        }
        return this._repository;
    }
    /**
     * Find a team by ID with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The team ID to find
     * @returns The team if found, null otherwise
     */
    async findById(tenantId, id) {
        return this.repository.findOne({
            where: { id, tenantId },
        });
    }
    /**
     * Find a team by ID without tenant isolation.
     * Use with caution - typically for internal operations
     * where tenant has already been validated.
     *
     * @param id - The team ID to find
     * @returns The team if found, null otherwise
     */
    async findByIdWithoutTenant(id) {
        return this.repository.findOne({
            where: { id },
        });
    }
    /**
     * Find a team by name within a tenant.
     *
     * @param tenantId - The tenant ID for isolation
     * @param name - The team name to search for (case-insensitive)
     * @returns The team if found, null otherwise
     */
    async findByName(tenantId, name) {
        return this.repository
            .createQueryBuilder('team')
            .where('team.tenant_id = :tenantId', { tenantId })
            .andWhere('LOWER(team.name) = LOWER(:name)', { name })
            .getOne();
    }
    /**
     * Find all teams for a tenant.
     *
     * @param tenantId - The tenant ID
     * @returns Array of teams belonging to the tenant
     */
    async findByTenant(tenantId) {
        return this.repository.find({
            where: { tenantId },
            order: { name: 'ASC' },
        });
    }
    /**
     * Find all active teams for a tenant.
     *
     * @param tenantId - The tenant ID
     * @returns Array of active teams belonging to the tenant
     */
    async findActiveByTenant(tenantId) {
        return this.repository.find({
            where: { tenantId, isActive: true },
            order: { name: 'ASC' },
        });
    }
    /**
     * Create a new team.
     *
     * @param data - The team data to create
     * @returns The created team
     */
    async create(data) {
        const team = this.repository.create(data);
        return this.repository.save(team);
    }
    /**
     * Update an existing team.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The team ID to update
     * @param data - The data to update
     * @returns The updated team if found, null otherwise
     */
    async update(tenantId, id, data) {
        const team = await this.findById(tenantId, id);
        if (!team) {
            return null;
        }
        Object.assign(team, data);
        return this.repository.save(team);
    }
    /**
     * Delete a team by ID with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The team ID to delete
     * @returns True if deleted, false if not found
     */
    async delete(tenantId, id) {
        const result = await this.repository.delete({ id, tenantId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Check if a team exists by name within a tenant.
     * Useful for preventing duplicate team names.
     *
     * @param name - The team name to check
     * @param tenantId - The tenant ID
     * @param excludeId - Optional team ID to exclude (for updates)
     * @returns True if a team with the name exists
     */
    async existsByName(name, tenantId, excludeId) {
        const query = this.repository
            .createQueryBuilder('team')
            .where('LOWER(team.name) = LOWER(:name)', { name })
            .andWhere('team.tenant_id = :tenantId', { tenantId });
        if (excludeId) {
            query.andWhere('team.id != :excludeId', { excludeId });
        }
        const count = await query.getCount();
        return count > 0;
    }
    /**
     * Count teams for a tenant.
     *
     * @param tenantId - The tenant ID
     * @returns The number of teams
     */
    async countByTenant(tenantId) {
        return this.repository.count({ where: { tenantId } });
    }
};
exports.TeamRepository = TeamRepository;
exports.TeamRepository = TeamRepository = __decorate([
    (0, tsyringe_1.singleton)()
], TeamRepository);
