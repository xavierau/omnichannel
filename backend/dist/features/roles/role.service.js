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
exports.RoleService = void 0;
const tsyringe_1 = require("tsyringe");
const role_repository_1 = require("./role.repository");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const redis_config_1 = require("../../config/redis.config");
const logger_config_1 = require("../../config/logger.config");
let RoleService = class RoleService {
    roleRepo;
    constructor(roleRepo) {
        this.roleRepo = roleRepo;
    }
    async findAll(options) {
        return this.roleRepo.findAll(options);
    }
    async findById(id) {
        const role = await this.roleRepo.findById(id);
        if (!role) {
            throw new http_exceptions_1.NotFoundException('Role not found');
        }
        return role;
    }
    async findByName(name) {
        return this.roleRepo.findByName(name);
    }
    async create(data, createdBy) {
        // Check if role name already exists
        const existing = await this.roleRepo.findByName(data.name);
        if (existing) {
            throw new http_exceptions_1.BadRequestException(`Role with name '${data.name}' already exists`);
        }
        const role = await this.roleRepo.create({
            name: data.name,
            displayName: data.displayName,
            description: data.description || null,
            level: data.level,
            isSystem: data.isSystem || false,
        });
        logger_config_1.auditLogger.info('Role created', {
            roleId: role.id,
            roleName: role.name,
            createdBy,
        });
        return role;
    }
    async update(id, data, updatedBy) {
        const role = await this.findById(id);
        // Prevent modifying system roles' name
        if (role.isSystem && data.name && data.name !== role.name) {
            throw new http_exceptions_1.ForbiddenException('Cannot modify the name of a system role');
        }
        // Check if new name conflicts with existing role
        if (data.name && data.name !== role.name) {
            const existing = await this.roleRepo.findByName(data.name);
            if (existing) {
                throw new http_exceptions_1.BadRequestException(`Role with name '${data.name}' already exists`);
            }
        }
        const updatedRole = await this.roleRepo.update(id, {
            name: data.name,
            displayName: data.displayName,
            description: data.description,
            level: data.level,
        });
        // Invalidate cached user permissions for users with this role
        await this.invalidateRoleCache(id);
        logger_config_1.auditLogger.info('Role updated', {
            roleId: id,
            roleName: updatedRole.name,
            changes: data,
            updatedBy,
        });
        return updatedRole;
    }
    async delete(id, deletedBy) {
        const role = await this.findById(id);
        // Prevent deleting system roles
        if (role.isSystem) {
            throw new http_exceptions_1.ForbiddenException('Cannot delete a system role');
        }
        // Check if role has users assigned
        const userCount = await this.roleRepo.countUsersWithRole(id);
        if (userCount > 0) {
            throw new http_exceptions_1.BadRequestException(`Cannot delete role '${role.name}' because it is assigned to ${userCount} user(s). Remove users from this role first.`);
        }
        await this.roleRepo.delete(id);
        logger_config_1.auditLogger.info('Role deleted', {
            roleId: id,
            roleName: role.name,
            deletedBy,
        });
    }
    async addPermissions(roleId, permissionIds, updatedBy) {
        const role = await this.findById(roleId);
        const updatedRole = await this.roleRepo.addPermissions(roleId, permissionIds);
        // Invalidate cached user permissions
        await this.invalidateRoleCache(roleId);
        logger_config_1.auditLogger.info('Permissions added to role', {
            roleId,
            roleName: role.name,
            addedPermissionIds: permissionIds,
            updatedBy,
        });
        return updatedRole;
    }
    async removePermissions(roleId, permissionIds, updatedBy) {
        const role = await this.findById(roleId);
        const updatedRole = await this.roleRepo.removePermissions(roleId, permissionIds);
        // Invalidate cached user permissions
        await this.invalidateRoleCache(roleId);
        logger_config_1.auditLogger.info('Permissions removed from role', {
            roleId,
            roleName: role.name,
            removedPermissionIds: permissionIds,
            updatedBy,
        });
        return updatedRole;
    }
    async syncPermissions(roleId, permissionIds, updatedBy) {
        const role = await this.findById(roleId);
        const updatedRole = await this.roleRepo.syncPermissions(roleId, permissionIds);
        // Invalidate cached user permissions
        await this.invalidateRoleCache(roleId);
        logger_config_1.auditLogger.info('Permissions synced for role', {
            roleId,
            roleName: role.name,
            newPermissionIds: permissionIds,
            updatedBy,
        });
        return updatedRole;
    }
    async getUserCount(roleId) {
        await this.findById(roleId); // Ensure role exists
        return this.roleRepo.countUsersWithRole(roleId);
    }
    /**
     * Invalidate Redis cache for all users with this role
     */
    async invalidateRoleCache(roleId) {
        try {
            // Get all user keys and delete those associated with this role
            // In production, consider using a more efficient approach with role-based cache keys
            const keys = await redis_config_1.redisClient.keys('user:*');
            if (keys.length > 0) {
                await redis_config_1.redisClient.del(...keys);
            }
        }
        catch (error) {
            // Log but don't fail the operation if cache invalidation fails
            logger_config_1.auditLogger.warn('Failed to invalidate role cache', {
                roleId,
                error: error.message,
            });
        }
    }
};
exports.RoleService = RoleService;
exports.RoleService = RoleService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(role_repository_1.RoleRepository)),
    __metadata("design:paramtypes", [role_repository_1.RoleRepository])
], RoleService);
