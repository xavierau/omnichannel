"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomFieldRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const custom_field_entity_1 = require("./custom-field.entity");
let CustomFieldRepository = class CustomFieldRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     * This prevents errors when the DI container instantiates this class before
     * the database connection is established.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(custom_field_entity_1.CustomFieldDefinition);
        }
        return this._repository;
    }
    /**
     * Find all custom fields for a tenant.
     */
    async findByTenant(tenantId, options) {
        const queryBuilder = this.repository
            .createQueryBuilder('field')
            .where('field.tenant_id = :tenantId', { tenantId });
        if (options?.entityType) {
            queryBuilder.andWhere('field.entity_type = :entityType', {
                entityType: options.entityType,
            });
        }
        if (options?.isVisible !== undefined) {
            queryBuilder.andWhere('field.is_visible = :isVisible', {
                isVisible: options.isVisible,
            });
        }
        if (options?.isSearchable !== undefined) {
            queryBuilder.andWhere('field.is_searchable = :isSearchable', {
                isSearchable: options.isSearchable,
            });
        }
        if (options?.isFilterable !== undefined) {
            queryBuilder.andWhere('field.is_filterable = :isFilterable', {
                isFilterable: options.isFilterable,
            });
        }
        return queryBuilder
            .orderBy('field.entityType', 'ASC')
            .addOrderBy('field.displayOrder', 'ASC')
            .getMany();
    }
    /**
     * Find a custom field by ID.
     */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
        });
    }
    /**
     * Find a custom field by ID for a specific tenant.
     */
    async findByIdAndTenant(id, tenantId) {
        return this.repository.findOne({
            where: { id, tenantId },
        });
    }
    /**
     * Find a custom field by field key for a specific entity type and tenant.
     */
    async findByFieldKey(tenantId, entityType, fieldKey) {
        return this.repository.findOne({
            where: { tenantId, entityType, fieldKey },
        });
    }
    /**
     * Create a new custom field.
     */
    async create(data) {
        const field = this.repository.create(data);
        return this.repository.save(field);
    }
    /**
     * Update a custom field.
     */
    async update(id, tenantId, data) {
        const field = await this.findByIdAndTenant(id, tenantId);
        if (!field) {
            return null;
        }
        Object.assign(field, data);
        return this.repository.save(field);
    }
    /**
     * Delete a custom field.
     */
    async delete(id, tenantId) {
        const result = await this.repository.delete({ id, tenantId });
        return result.affected !== 0;
    }
    /**
     * Get the maximum display order for a given entity type.
     */
    async getMaxDisplayOrder(tenantId, entityType) {
        const result = await this.repository
            .createQueryBuilder('field')
            .select('MAX(field.display_order)', 'maxOrder')
            .where('field.tenant_id = :tenantId', { tenantId })
            .andWhere('field.entity_type = :entityType', { entityType })
            .getRawOne();
        return result?.maxOrder ?? -1;
    }
    /**
     * Reorder custom fields for a given entity type.
     *
     * @param tenantId - Tenant ID
     * @param entityType - Entity type to reorder
     * @param orderedIds - Array of field IDs in the desired order
     * @returns true if all fields were updated
     */
    async reorder(tenantId, entityType, orderedIds) {
        // Verify all IDs belong to the tenant and entity type
        const existingFields = await this.repository.find({
            where: { tenantId, entityType },
            select: ['id'],
        });
        const existingIds = new Set(existingFields.map((f) => f.id));
        const validIds = orderedIds.filter((id) => existingIds.has(id));
        if (validIds.length !== orderedIds.length) {
            return false;
        }
        // Update display order for each field
        const updates = validIds.map((id, index) => this.repository.update({ id, tenantId }, { displayOrder: index }));
        await Promise.all(updates);
        return true;
    }
    /**
     * Count custom fields for a tenant.
     */
    async countByTenant(tenantId) {
        return this.repository.count({ where: { tenantId } });
    }
    /**
     * Count custom fields by entity type for a tenant.
     */
    async countByEntityType(tenantId, entityType) {
        return this.repository.count({ where: { tenantId, entityType } });
    }
    /**
     * Check if a field key exists for a given entity type and tenant.
     */
    async fieldKeyExists(tenantId, entityType, fieldKey, excludeId) {
        const queryBuilder = this.repository
            .createQueryBuilder('field')
            .where('field.tenant_id = :tenantId', { tenantId })
            .andWhere('field.entity_type = :entityType', { entityType })
            .andWhere('field.field_key = :fieldKey', { fieldKey });
        if (excludeId) {
            queryBuilder.andWhere('field.id != :excludeId', { excludeId });
        }
        const count = await queryBuilder.getCount();
        return count > 0;
    }
};
exports.CustomFieldRepository = CustomFieldRepository;
exports.CustomFieldRepository = CustomFieldRepository = __decorate([
    (0, tsyringe_1.singleton)()
], CustomFieldRepository);
