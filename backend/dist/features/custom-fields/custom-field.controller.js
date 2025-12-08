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
exports.CustomFieldController = void 0;
const tsyringe_1 = require("tsyringe");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const custom_field_service_1 = require("./custom-field.service");
const custom_field_entity_1 = require("./custom-field.entity");
const custom_field_dto_1 = require("./dto/custom-field.dto");
const logger_config_1 = require("../../config/logger.config");
/**
 * Controller for custom field management.
 *
 * Handles HTTP requests for CRUD operations on custom field definitions.
 */
let CustomFieldController = class CustomFieldController {
    customFieldService;
    constructor(customFieldService) {
        this.customFieldService = customFieldService;
    }
    /**
     * GET /api/custom-fields
     * List all custom fields for the tenant.
     * Query params: entityType (optional)
     */
    async list(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const entityTypeParam = req.query.entityType;
            let entityType;
            if (entityTypeParam) {
                if (!Object.values(custom_field_entity_1.CustomFieldEntityType).includes(entityTypeParam)) {
                    res.status(400).json({
                        error: `Invalid entityType. Must be one of: ${Object.values(custom_field_entity_1.CustomFieldEntityType).join(', ')}`,
                    });
                    return;
                }
                entityType = entityTypeParam;
            }
            const fields = await this.customFieldService.getByTenant(tenantId, entityType);
            res.json({ data: fields });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/custom-fields/:id
     * Get a specific custom field.
     */
    async get(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const field = await this.customFieldService.getById(id, tenantId);
            if (!field) {
                res.status(404).json({ error: 'Custom field not found' });
                return;
            }
            res.json({ data: field });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/custom-fields
     * Create a new custom field.
     */
    async create(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            // Transform and validate DTO
            const dto = (0, class_transformer_1.plainToInstance)(custom_field_dto_1.CreateCustomFieldDto, req.body);
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length > 0) {
                const errorMessages = errors
                    .map((e) => Object.values(e.constraints || {}).join(', '))
                    .join('; ');
                res.status(400).json({ error: errorMessages });
                return;
            }
            const field = await this.customFieldService.create(tenantId, dto);
            logger_config_1.logger.info('Custom field created via API', {
                customFieldId: field.id,
                tenantId,
                entityType: dto.entityType,
                fieldKey: dto.fieldKey,
            });
            res.status(201).json({ data: field });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('already exists') ||
                    error.message.includes('must start with') ||
                    error.message.includes('required for') ||
                    error.message.includes('not allowed for') ||
                    error.message.includes('must be a')) {
                    res.status(400).json({ error: error.message });
                    return;
                }
            }
            next(error);
        }
    }
    /**
     * PUT /api/custom-fields/:id
     * Update a custom field.
     */
    async update(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            // Transform and validate DTO
            const dto = (0, class_transformer_1.plainToInstance)(custom_field_dto_1.UpdateCustomFieldDto, req.body);
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length > 0) {
                const errorMessages = errors
                    .map((e) => Object.values(e.constraints || {}).join(', '))
                    .join('; ');
                res.status(400).json({ error: errorMessages });
                return;
            }
            const field = await this.customFieldService.update(id, tenantId, dto);
            if (!field) {
                res.status(404).json({ error: 'Custom field not found' });
                return;
            }
            logger_config_1.logger.info('Custom field updated via API', {
                customFieldId: id,
                tenantId,
            });
            res.json({ data: field });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('required for') ||
                    error.message.includes('not allowed for') ||
                    error.message.includes('must be a')) {
                    res.status(400).json({ error: error.message });
                    return;
                }
            }
            next(error);
        }
    }
    /**
     * DELETE /api/custom-fields/:id
     * Delete a custom field.
     */
    async delete(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const deleted = await this.customFieldService.delete(id, tenantId);
            if (!deleted) {
                res.status(404).json({ error: 'Custom field not found' });
                return;
            }
            logger_config_1.logger.info('Custom field deleted via API', {
                customFieldId: id,
                tenantId,
            });
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /api/custom-fields/reorder
     * Reorder custom fields for an entity type.
     */
    async reorder(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            // Transform and validate DTO
            const dto = (0, class_transformer_1.plainToInstance)(custom_field_dto_1.ReorderCustomFieldsDto, req.body);
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length > 0) {
                const errorMessages = errors
                    .map((e) => Object.values(e.constraints || {}).join(', '))
                    .join('; ');
                res.status(400).json({ error: errorMessages });
                return;
            }
            const success = await this.customFieldService.reorder(tenantId, dto.entityType, dto.orderedIds);
            if (!success) {
                res.status(400).json({
                    error: 'Some field IDs are invalid or do not belong to this entity type',
                });
                return;
            }
            logger_config_1.logger.info('Custom fields reordered via API', {
                tenantId,
                entityType: dto.entityType,
                fieldCount: dto.orderedIds.length,
            });
            res.json({
                data: {
                    success: true,
                    message: 'Fields reordered successfully',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
};
exports.CustomFieldController = CustomFieldController;
exports.CustomFieldController = CustomFieldController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(custom_field_service_1.CustomFieldService)),
    __metadata("design:paramtypes", [custom_field_service_1.CustomFieldService])
], CustomFieldController);
