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
exports.PermissionService = void 0;
const tsyringe_1 = require("tsyringe");
const user_repository_1 = require("./user.repository");
let PermissionService = class PermissionService {
    userRepo;
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    /**
     * Get all permissions for a user from their roles
     */
    async getUserPermissions(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user || !user.roles) {
            return [];
        }
        const permissions = [];
        for (const role of user.roles) {
            if (role.permissions) {
                for (const permission of role.permissions) {
                    const permissionString = `${permission.resource}:${permission.action}:${permission.scope}`;
                    if (!permissions.includes(permissionString)) {
                        permissions.push(permissionString);
                    }
                }
            }
        }
        return permissions;
    }
    /**
     * Check if a user has a specific permission
     */
    async hasPermission(userId, requiredPermission) {
        const permissions = await this.getUserPermissions(userId);
        return permissions.includes(requiredPermission);
    }
    /**
     * Check if a user has ANY of the specified permissions
     */
    async hasAnyPermission(userId, requiredPermissions) {
        const permissions = await this.getUserPermissions(userId);
        return requiredPermissions.some((required) => permissions.includes(required));
    }
    /**
     * Check if a user has ALL of the specified permissions
     */
    async hasAllPermissions(userId, requiredPermissions) {
        const permissions = await this.getUserPermissions(userId);
        return requiredPermissions.every((required) => permissions.includes(required));
    }
};
exports.PermissionService = PermissionService;
exports.PermissionService = PermissionService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(user_repository_1.UserRepository)),
    __metadata("design:paramtypes", [user_repository_1.UserRepository])
], PermissionService);
