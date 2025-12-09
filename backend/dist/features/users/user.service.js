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
exports.UserService = void 0;
const tsyringe_1 = require("tsyringe");
const user_repository_1 = require("./user.repository");
const user_entity_1 = require("./user.entity");
const password_service_1 = require("./password.service");
const permission_service_1 = require("./permission.service");
const role_repository_1 = require("../roles/role.repository");
const redis_config_1 = require("../../config/redis.config");
const logger_config_1 = require("../../config/logger.config");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
let UserService = class UserService {
    userRepo;
    passwordService;
    permissionService;
    roleRepo;
    constructor(userRepo, passwordService, permissionService, roleRepo) {
        this.userRepo = userRepo;
        this.passwordService = passwordService;
        this.permissionService = permissionService;
        this.roleRepo = roleRepo;
    }
    /**
     * Create a new user account.
     *
     * Security considerations for timing attack prevention:
     * - Password hashing is performed BEFORE checking email existence
     * - This ensures consistent timing regardless of whether email exists
     * - Generic error messages are used (handled by controller)
     */
    async createUser(data) {
        // SECURITY: Hash password FIRST, before checking email existence.
        // This ensures the expensive hashing operation occurs regardless of
        // whether the email exists, preventing timing-based enumeration.
        // Password validation (strength check) happens inside hashPassword.
        const passwordHash = await this.passwordService.hashPassword(data.password);
        // Check if user already exists AFTER hashing
        const existingUser = await this.userRepo.findByEmail(data.email);
        if (existingUser) {
            // Generic error - the controller will convert this to a user-friendly message
            throw new Error('Registration failed');
        }
        // Create user
        const user = await this.userRepo.create({
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            status: data.status || user_entity_1.UserStatus.ACTIVE,
            emailVerified: false,
            tenantId: data.tenantId || null,
        });
        return user;
    }
    async findById(id) {
        return this.userRepo.findById(id);
    }
    async findByEmail(email) {
        return this.userRepo.findByEmail(email);
    }
    async updateUser(id, data) {
        const user = await this.userRepo.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        const updatedUser = await this.userRepo.update(id, data);
        // Invalidate Redis cache when user is updated
        await redis_config_1.redisClient.del(`user:${id}`);
        return updatedUser;
    }
    async updatePassword(userId, newPassword) {
        // Use PasswordService for password hashing (includes strength validation)
        const passwordHash = await this.passwordService.hashPassword(newPassword);
        await this.userRepo.update(userId, { passwordHash });
        // Invalidate Redis cache
        await redis_config_1.redisClient.del(`user:${userId}`);
    }
    async validateCredentials(email, password) {
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            return null;
        }
        // Use PasswordService for password verification
        const isValid = await this.passwordService.verifyPassword(user.passwordHash, password);
        if (!isValid) {
            return null;
        }
        return user;
    }
    async getUserPermissions(userId) {
        // Use PermissionService instead of entity method
        return this.permissionService.getUserPermissions(userId);
    }
    async updateLastLogin(userId) {
        await this.userRepo.updateLastLogin(userId);
    }
    async listUsers(options) {
        const page = options?.page || 1;
        const limit = options?.limit || 10;
        const skip = (page - 1) * limit;
        const [users, total] = await this.userRepo.findAll({
            skip,
            take: limit,
            status: options?.status,
        });
        return {
            users,
            total,
            page,
            limit,
        };
    }
    async deleteUser(id) {
        const user = await this.userRepo.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        await this.userRepo.delete(id);
        // Invalidate Redis cache
        await redis_config_1.redisClient.del(`user:${id}`);
    }
    /**
     * Add roles to a user
     */
    async addRoles(userId, roleIds, updatedBy) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new http_exceptions_1.NotFoundException('User not found');
        }
        if (!roleIds || roleIds.length === 0) {
            throw new http_exceptions_1.BadRequestException('At least one role ID is required');
        }
        // Verify all roles exist
        const roles = await this.roleRepo.findByIds(roleIds);
        if (roles.length !== roleIds.length) {
            throw new http_exceptions_1.BadRequestException('One or more role IDs are invalid');
        }
        // Add new roles (avoid duplicates)
        const existingRoleIds = new Set(user.roles.map((r) => r.id));
        for (const role of roles) {
            if (!existingRoleIds.has(role.id)) {
                user.roles.push(role);
            }
        }
        const updatedUser = await this.userRepo.save(user);
        // Invalidate Redis cache
        await redis_config_1.redisClient.del(`user:${userId}`);
        logger_config_1.auditLogger.info('Roles added to user', {
            userId,
            userEmail: user.email,
            addedRoleIds: roleIds,
            updatedBy,
        });
        return updatedUser;
    }
    /**
     * Remove roles from a user
     */
    async removeRoles(userId, roleIds, updatedBy) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new http_exceptions_1.NotFoundException('User not found');
        }
        if (!roleIds || roleIds.length === 0) {
            throw new http_exceptions_1.BadRequestException('At least one role ID is required');
        }
        const idsToRemove = new Set(roleIds);
        user.roles = user.roles.filter((r) => !idsToRemove.has(r.id));
        const updatedUser = await this.userRepo.save(user);
        // Invalidate Redis cache
        await redis_config_1.redisClient.del(`user:${userId}`);
        logger_config_1.auditLogger.info('Roles removed from user', {
            userId,
            userEmail: user.email,
            removedRoleIds: roleIds,
            updatedBy,
        });
        return updatedUser;
    }
    /**
     * Sync (replace) all roles for a user
     */
    async syncRoles(userId, roleIds, updatedBy) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new http_exceptions_1.NotFoundException('User not found');
        }
        if (!roleIds) {
            throw new http_exceptions_1.BadRequestException('Role IDs array is required');
        }
        if (roleIds.length === 0) {
            user.roles = [];
        }
        else {
            const roles = await this.roleRepo.findByIds(roleIds);
            if (roles.length !== roleIds.length) {
                throw new http_exceptions_1.BadRequestException('One or more role IDs are invalid');
            }
            user.roles = roles;
        }
        const updatedUser = await this.userRepo.save(user);
        // Invalidate Redis cache
        await redis_config_1.redisClient.del(`user:${userId}`);
        logger_config_1.auditLogger.info('Roles synced for user', {
            userId,
            userEmail: user.email,
            newRoleIds: roleIds,
            updatedBy,
        });
        return updatedUser;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(user_repository_1.UserRepository)),
    __param(1, (0, tsyringe_1.inject)(password_service_1.PasswordService)),
    __param(2, (0, tsyringe_1.inject)(permission_service_1.PermissionService)),
    __param(3, (0, tsyringe_1.inject)(role_repository_1.RoleRepository)),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        password_service_1.PasswordService,
        permission_service_1.PermissionService,
        role_repository_1.RoleRepository])
], UserService);
