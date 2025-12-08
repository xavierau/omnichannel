"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnerOrPermission = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = exports.requireRoleLevel = exports.requireRole = exports.RoleLevel = void 0;
const tsyringe_1 = require("tsyringe");
const permission_service_1 = require("@features/users/permission.service");
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
const logger_config_1 = require("@config/logger.config");
const permission_entity_1 = require("@features/permissions/permission.entity");
/**
 * Role levels (lower number = more privileged)
 */
exports.RoleLevel = {
    SUPER_ADMIN: 1,
    ADMIN: 2,
    MANAGER: 3,
    AGENT: 4,
};
/**
 * Check if user has any of the specified roles
 */
const requireRole = (...roleNames) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new http_exceptions_1.ForbiddenException('Authentication required');
            }
            const userRoleNames = user.roles?.map((r) => r.name) || [];
            const hasRole = roleNames.some((role) => userRoleNames.includes(role));
            if (!hasRole) {
                logger_config_1.auditLogger.warn('Authorization failed: missing role', {
                    userId: user.id,
                    email: user.email,
                    requiredRoles: roleNames,
                    userRoles: userRoleNames,
                    path: req.path,
                    method: req.method,
                });
                throw new http_exceptions_1.ForbiddenException(`Access denied. Required role: ${roleNames.join(' or ')}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireRole = requireRole;
/**
 * Check if user has a role with level <= maxLevel (lower = more privileged)
 * Level 1 = super_admin, Level 2 = admin, Level 3 = manager, Level 4 = agent
 */
const requireRoleLevel = (maxLevel) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new http_exceptions_1.ForbiddenException('Authentication required');
            }
            const userRoleLevels = user.roles?.map((r) => r.level) || [];
            const minUserLevel = Math.min(...userRoleLevels, Infinity);
            const hasRequiredLevel = minUserLevel <= maxLevel;
            if (!hasRequiredLevel) {
                logger_config_1.auditLogger.warn('Authorization failed: insufficient role level', {
                    userId: user.id,
                    email: user.email,
                    requiredLevel: maxLevel,
                    userMinLevel: minUserLevel,
                    path: req.path,
                    method: req.method,
                });
                throw new http_exceptions_1.ForbiddenException('Access denied. Insufficient privileges.');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireRoleLevel = requireRoleLevel;
/**
 * Check if the action is implied by the "manage" permission
 */
const isActionImpliedByManage = (action) => {
    const impliedActions = [
        permission_entity_1.PermissionAction.CREATE,
        permission_entity_1.PermissionAction.READ,
        permission_entity_1.PermissionAction.UPDATE,
        permission_entity_1.PermissionAction.DELETE,
    ];
    return impliedActions.includes(action);
};
/**
 * Check if user has a specific permission
 * Supports "manage" as wildcard (implies create, read, update, delete)
 */
const requirePermission = (resource, action, scope = 'all') => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new http_exceptions_1.ForbiddenException('Authentication required');
            }
            const permissionService = tsyringe_1.container.resolve(permission_service_1.PermissionService);
            const requiredPermission = `${resource}:${action}:${scope}`;
            // Check exact permission
            let hasPermission = await permissionService.hasPermission(user.id, requiredPermission);
            // If not found and action is not "manage", check if user has "manage" permission
            if (!hasPermission && action !== permission_entity_1.PermissionAction.MANAGE && isActionImpliedByManage(action)) {
                const managePermission = `${resource}:${permission_entity_1.PermissionAction.MANAGE}:${scope}`;
                hasPermission = await permissionService.hasPermission(user.id, managePermission);
            }
            // If scope is "own", also check "all" scope (all implies own)
            if (!hasPermission && scope === 'own') {
                const allScopePermission = `${resource}:${action}:all`;
                hasPermission = await permissionService.hasPermission(user.id, allScopePermission);
                // Also check manage:all
                if (!hasPermission && action !== permission_entity_1.PermissionAction.MANAGE && isActionImpliedByManage(action)) {
                    const manageAllPermission = `${resource}:${permission_entity_1.PermissionAction.MANAGE}:all`;
                    hasPermission = await permissionService.hasPermission(user.id, manageAllPermission);
                }
            }
            if (!hasPermission) {
                logger_config_1.auditLogger.warn('Authorization failed: missing permission', {
                    userId: user.id,
                    email: user.email,
                    requiredPermission,
                    path: req.path,
                    method: req.method,
                });
                throw new http_exceptions_1.ForbiddenException(`Access denied. Required permission: ${requiredPermission}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requirePermission = requirePermission;
/**
 * Check if user has any of the specified permissions
 */
const requireAnyPermission = (...permissions) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new http_exceptions_1.ForbiddenException('Authentication required');
            }
            const permissionService = tsyringe_1.container.resolve(permission_service_1.PermissionService);
            const hasAny = await permissionService.hasAnyPermission(user.id, permissions);
            if (!hasAny) {
                logger_config_1.auditLogger.warn('Authorization failed: missing any permission', {
                    userId: user.id,
                    email: user.email,
                    requiredPermissions: permissions,
                    path: req.path,
                    method: req.method,
                });
                throw new http_exceptions_1.ForbiddenException(`Access denied. Required one of: ${permissions.join(', ')}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireAnyPermission = requireAnyPermission;
/**
 * Check if user has all of the specified permissions
 */
const requireAllPermissions = (...permissions) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new http_exceptions_1.ForbiddenException('Authentication required');
            }
            const permissionService = tsyringe_1.container.resolve(permission_service_1.PermissionService);
            const hasAll = await permissionService.hasAllPermissions(user.id, permissions);
            if (!hasAll) {
                logger_config_1.auditLogger.warn('Authorization failed: missing all permissions', {
                    userId: user.id,
                    email: user.email,
                    requiredPermissions: permissions,
                    path: req.path,
                    method: req.method,
                });
                throw new http_exceptions_1.ForbiddenException(`Access denied. Required all of: ${permissions.join(', ')}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireAllPermissions = requireAllPermissions;
/**
 * Check if user is the owner of the resource or has admin privileges
 * Useful for "own" scope permissions
 */
const requireOwnerOrPermission = (resource, action, getOwnerId) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new http_exceptions_1.ForbiddenException('Authentication required');
            }
            const ownerId = await getOwnerId(req);
            const isOwner = user.id === ownerId;
            if (isOwner) {
                // User is the owner, check "own" scope permission
                const permissionService = tsyringe_1.container.resolve(permission_service_1.PermissionService);
                const ownPermission = `${resource}:${action}:own`;
                const hasOwnPermission = await permissionService.hasPermission(user.id, ownPermission);
                if (hasOwnPermission) {
                    return next();
                }
            }
            // Not owner or doesn't have own permission, check "all" scope
            const permissionService = tsyringe_1.container.resolve(permission_service_1.PermissionService);
            const allPermission = `${resource}:${action}:all`;
            const hasAllPermission = await permissionService.hasPermission(user.id, allPermission);
            if (!hasAllPermission) {
                // Also check manage permission
                const managePermission = `${resource}:${permission_entity_1.PermissionAction.MANAGE}:all`;
                const hasManagePermission = await permissionService.hasPermission(user.id, managePermission);
                if (!hasManagePermission) {
                    logger_config_1.auditLogger.warn('Authorization failed: not owner and missing permission', {
                        userId: user.id,
                        email: user.email,
                        resourceOwnerId: ownerId,
                        resource,
                        action,
                        path: req.path,
                        method: req.method,
                    });
                    throw new http_exceptions_1.ForbiddenException('Access denied. You can only access your own resources.');
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireOwnerOrPermission = requireOwnerOrPermission;
