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
exports.PermissionCrudService = void 0;
const tsyringe_1 = require("tsyringe");
const permission_repository_1 = require("./permission.repository");
const permission_entity_1 = require("./permission.entity");
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
const logger_config_1 = require("@config/logger.config");
let PermissionCrudService = class PermissionCrudService {
    permissionRepo;
    constructor(permissionRepo) {
        this.permissionRepo = permissionRepo;
    }
    async findAll(options) {
        return this.permissionRepo.findAll(options);
    }
    async findById(id) {
        const permission = await this.permissionRepo.findById(id);
        if (!permission) {
            throw new http_exceptions_1.NotFoundException('Permission not found');
        }
        return permission;
    }
    async findByIds(ids) {
        return this.permissionRepo.findByIds(ids);
    }
    async getPermissionsByResource(resource) {
        return this.permissionRepo.findAll({ resource });
    }
    async getAllGroupedByResource() {
        return this.permissionRepo.getAllGroupedByResource();
    }
    async create(data, createdBy) {
        // Check if permission already exists
        const existing = await this.permissionRepo.findByResourceActionScope(data.resource, data.action, data.scope);
        if (existing) {
            throw new http_exceptions_1.BadRequestException(`Permission '${data.resource}:${data.action}:${data.scope}' already exists`);
        }
        const permission = await this.permissionRepo.create({
            resource: data.resource,
            action: data.action,
            scope: data.scope,
            description: data.description || null,
        });
        logger_config_1.auditLogger.info('Permission created', {
            permissionId: permission.id,
            permission: `${permission.resource}:${permission.action}:${permission.scope}`,
            createdBy,
        });
        return permission;
    }
    async bulkCreate(data, createdBy) {
        // Filter out existing permissions
        const toCreate = [];
        for (const item of data) {
            const existing = await this.permissionRepo.findByResourceActionScope(item.resource, item.action, item.scope);
            if (!existing) {
                toCreate.push(item);
            }
        }
        if (toCreate.length === 0) {
            return [];
        }
        const permissions = await this.permissionRepo.bulkCreate(toCreate.map((d) => ({
            resource: d.resource,
            action: d.action,
            scope: d.scope,
            description: d.description || null,
        })));
        logger_config_1.auditLogger.info('Permissions bulk created', {
            count: permissions.length,
            permissions: permissions.map((p) => `${p.resource}:${p.action}:${p.scope}`),
            createdBy,
        });
        return permissions;
    }
    async delete(id, deletedBy) {
        const permission = await this.findById(id);
        await this.permissionRepo.delete(id);
        logger_config_1.auditLogger.info('Permission deleted', {
            permissionId: id,
            permission: `${permission.resource}:${permission.action}:${permission.scope}`,
            deletedBy,
        });
    }
    /**
     * Get all available resources
     */
    getAvailableResources() {
        return Object.values(permission_entity_1.PermissionResource);
    }
    /**
     * Get all available actions
     */
    getAvailableActions() {
        return Object.values(permission_entity_1.PermissionAction);
    }
    /**
     * Get all available scopes
     */
    getAvailableScopes() {
        return Object.values(permission_entity_1.PermissionScope);
    }
    /**
     * Get count of all permissions
     */
    async count() {
        return this.permissionRepo.count();
    }
};
exports.PermissionCrudService = PermissionCrudService;
exports.PermissionCrudService = PermissionCrudService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(permission_repository_1.PermissionRepository)),
    __metadata("design:paramtypes", [permission_repository_1.PermissionRepository])
], PermissionCrudService);
