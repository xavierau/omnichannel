"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomFieldService = void 0;
const tsyringe_1 = require("tsyringe");
const custom_field_repository_1 = require("./custom-field.repository");
const custom_field_entity_1 = require("./custom-field.entity");
const custom_field_dto_1 = require("./dto/custom-field.dto");
const logger_config_1 = require("../../config/logger.config");
/**
 * Service for managing custom field definitions.
 *
 * Handles CRUD operations and business logic for tenant-defined custom fields.
 */
let CustomFieldService = class CustomFieldService {
    customFieldRepo;
    constructor(customFieldRepo) {
        this.customFieldRepo = customFieldRepo;
    }
    /**
     * Get all custom fields for a tenant.
     *
     * @param tenantId - Tenant ID
     * @param entityType - Optional filter by entity type
     * @returns List of custom fields
     */
    async getByTenant(tenantId, entityType) {
        const fields = await this.customFieldRepo.findByTenant(tenantId, {
            entityType,
        });
        return fields.map((field) => custom_field_dto_1.CustomFieldResponseDto.fromEntity(field));
    }
    /**
     * Get a custom field by ID.
     *
     * @param id - Custom field ID
     * @param tenantId - Tenant ID for authorization
     * @returns Custom field or null
     */
    async getById(id, tenantId) {
        const field = await this.customFieldRepo.findByIdAndTenant(id, tenantId);
        if (!field) {
            return null;
        }
        return custom_field_dto_1.CustomFieldResponseDto.fromEntity(field);
    }
    /**
     * Create a new custom field.
     *
     * @param tenantId - Tenant ID
     * @param dto - Creation data
     * @returns Created custom field
     * @throws Error if validation fails
     */
    async create(tenantId, dto) {
        // Validate field key format (alphanumeric and underscores only)
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(dto.fieldKey)) {
            throw new Error('Field key must start with a letter and contain only letters, numbers, and underscores');
        }
        // Check for duplicate field key
        const existingField = await this.customFieldRepo.fieldKeyExists(tenantId, dto.entityType, dto.fieldKey);
        if (existingField) {
            throw new Error(`Field key '${dto.fieldKey}' already exists for entity type '${dto.entityType}'`);
        }
        // Validate options for SELECT/MULTISELECT types
        this.validateOptionsForFieldType(dto.fieldType, dto.options);
        // Validate default value matches field type
        if (dto.defaultValue !== undefined && dto.defaultValue !== null) {
            this.validateDefaultValue(dto.fieldType, dto.defaultValue);
        }
        // Get the next display order if not specified
        let displayOrder = dto.displayOrder;
        if (displayOrder === undefined) {
            const maxOrder = await this.customFieldRepo.getMaxDisplayOrder(tenantId, dto.entityType);
            displayOrder = maxOrder + 1;
        }
        const field = await this.customFieldRepo.create({
            tenantId,
            entityType: dto.entityType,
            fieldKey: dto.fieldKey,
            displayLabel: dto.displayLabel,
            description: dto.description || null,
            fieldType: dto.fieldType,
            validation: dto.validation || {},
            defaultValue: dto.defaultValue ?? null,
            options: dto.options || null,
            displayOrder,
            isVisible: dto.isVisible ?? true,
            isSearchable: dto.isSearchable ?? false,
            isFilterable: dto.isFilterable ?? false,
        });
        logger_config_1.logger.info('Custom field created', {
            customFieldId: field.id,
            tenantId,
            entityType: dto.entityType,
            fieldKey: dto.fieldKey,
        });
        return custom_field_dto_1.CustomFieldResponseDto.fromEntity(field);
    }
    /**
     * Update a custom field.
     *
     * @param id - Custom field ID
     * @param tenantId - Tenant ID for authorization
     * @param dto - Update data
     * @returns Updated custom field
     */
    async update(id, tenantId, dto) {
        const existing = await this.customFieldRepo.findByIdAndTenant(id, tenantId);
        if (!existing) {
            return null;
        }
        const updateData = {};
        if (dto.displayLabel !== undefined) {
            updateData.displayLabel = dto.displayLabel;
        }
        if (dto.description !== undefined) {
            updateData.description = dto.description || null;
        }
        if (dto.validation !== undefined) {
            updateData.validation = dto.validation;
        }
        if (dto.options !== undefined) {
            // Validate options for SELECT/MULTISELECT types
            this.validateOptionsForFieldType(existing.fieldType, dto.options);
            updateData.options = dto.options || null;
        }
        if (dto.defaultValue !== undefined) {
            if (dto.defaultValue !== null) {
                this.validateDefaultValue(existing.fieldType, dto.defaultValue);
            }
            updateData.defaultValue = dto.defaultValue;
        }
        if (dto.displayOrder !== undefined) {
            updateData.displayOrder = dto.displayOrder;
        }
        if (dto.isVisible !== undefined) {
            updateData.isVisible = dto.isVisible;
        }
        if (dto.isSearchable !== undefined) {
            updateData.isSearchable = dto.isSearchable;
        }
        if (dto.isFilterable !== undefined) {
            updateData.isFilterable = dto.isFilterable;
        }
        const updated = await this.customFieldRepo.update(id, tenantId, updateData);
        if (!updated) {
            return null;
        }
        logger_config_1.logger.info('Custom field updated', {
            customFieldId: id,
            tenantId,
            fieldsUpdated: Object.keys(updateData),
        });
        return custom_field_dto_1.CustomFieldResponseDto.fromEntity(updated);
    }
    /**
     * Delete a custom field.
     *
     * @param id - Custom field ID
     * @param tenantId - Tenant ID for authorization
     * @returns true if deleted
     */
    async delete(id, tenantId) {
        const deleted = await this.customFieldRepo.delete(id, tenantId);
        if (deleted) {
            logger_config_1.logger.info('Custom field deleted', {
                customFieldId: id,
                tenantId,
            });
        }
        return deleted;
    }
    /**
     * Reorder custom fields for an entity type.
     *
     * @param tenantId - Tenant ID
     * @param entityType - Entity type to reorder
     * @param orderedIds - Array of field IDs in desired order
     * @returns true if successful
     */
    async reorder(tenantId, entityType, orderedIds) {
        const success = await this.customFieldRepo.reorder(tenantId, entityType, orderedIds);
        if (success) {
            logger_config_1.logger.info('Custom fields reordered', {
                tenantId,
                entityType,
                fieldCount: orderedIds.length,
            });
        }
        return success;
    }
    /**
     * Validate that options are provided for SELECT/MULTISELECT field types.
     */
    validateOptionsForFieldType(fieldType, options) {
        const requiresOptions = fieldType === custom_field_entity_1.CustomFieldType.SELECT ||
            fieldType === custom_field_entity_1.CustomFieldType.MULTISELECT;
        if (requiresOptions && (!options || options.length === 0)) {
            throw new Error(`Options are required for ${fieldType} field type`);
        }
        if (!requiresOptions && options && options.length > 0) {
            throw new Error(`Options are not allowed for ${fieldType} field type`);
        }
    }
    /**
     * Validate that the default value matches the field type.
     */
    validateDefaultValue(fieldType, defaultValue) {
        switch (fieldType) {
            case custom_field_entity_1.CustomFieldType.TEXT:
            case custom_field_entity_1.CustomFieldType.TEXTAREA:
            case custom_field_entity_1.CustomFieldType.PHONE:
            case custom_field_entity_1.CustomFieldType.EMAIL:
            case custom_field_entity_1.CustomFieldType.URL:
            case custom_field_entity_1.CustomFieldType.DATE:
            case custom_field_entity_1.CustomFieldType.DATETIME:
            case custom_field_entity_1.CustomFieldType.SELECT:
                if (typeof defaultValue !== 'string') {
                    throw new Error(`Default value for ${fieldType} must be a string`);
                }
                break;
            case custom_field_entity_1.CustomFieldType.NUMBER:
                if (typeof defaultValue !== 'number') {
                    throw new Error(`Default value for ${fieldType} must be a number`);
                }
                break;
            case custom_field_entity_1.CustomFieldType.BOOLEAN:
                if (typeof defaultValue !== 'boolean') {
                    throw new Error(`Default value for ${fieldType} must be a boolean`);
                }
                break;
            case custom_field_entity_1.CustomFieldType.MULTISELECT:
                if (!Array.isArray(defaultValue)) {
                    throw new Error(`Default value for ${fieldType} must be an array of strings`);
                }
                if (!defaultValue.every((v) => typeof v === 'string')) {
                    throw new Error(`Default value for ${fieldType} must be an array of strings`);
                }
                break;
        }
    }
};
exports.CustomFieldService = CustomFieldService;
exports.CustomFieldService = CustomFieldService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(custom_field_repository_1.CustomFieldRepository)),
    __metadata("design:paramtypes", [custom_field_repository_1.CustomFieldRepository])
], CustomFieldService);
