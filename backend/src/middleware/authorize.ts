import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { PermissionService } from '@features/users/permission.service';
import { ForbiddenException } from '@shared/exceptions/http-exceptions';
import { auditLogger } from '@config/logger.config';
import { User } from '@features/users/user.entity';
import { PermissionAction } from '@features/permissions/permission.entity';

/**
 * Permission string format: "resource:action:scope"
 * Examples: "users:read:all", "broadcasts:create:own", "customers:manage:all"
 */
export type PermissionString = `${string}:${string}:${string}`;

/**
 * Role levels (lower number = more privileged)
 */
export const RoleLevel = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  AGENT: 4,
} as const;

/**
 * Check if user has any of the specified roles
 */
export const requireRole = (...roleNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User | undefined;

      if (!user) {
        throw new ForbiddenException('Authentication required');
      }

      const userRoleNames = user.roles?.map((r) => r.name) || [];
      const hasRole = roleNames.some((role) => userRoleNames.includes(role));

      if (!hasRole) {
        auditLogger.warn('Authorization failed: missing role', {
          userId: user.id,
          email: user.email,
          requiredRoles: roleNames,
          userRoles: userRoleNames,
          path: req.path,
          method: req.method,
        });
        throw new ForbiddenException(
          `Access denied. Required role: ${roleNames.join(' or ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has a role with level <= maxLevel (lower = more privileged)
 * Level 1 = super_admin, Level 2 = admin, Level 3 = manager, Level 4 = agent
 */
export const requireRoleLevel = (maxLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User | undefined;

      if (!user) {
        throw new ForbiddenException('Authentication required');
      }

      const userRoleLevels = user.roles?.map((r) => r.level) || [];
      const minUserLevel = Math.min(...userRoleLevels, Infinity);
      const hasRequiredLevel = minUserLevel <= maxLevel;

      if (!hasRequiredLevel) {
        auditLogger.warn('Authorization failed: insufficient role level', {
          userId: user.id,
          email: user.email,
          requiredLevel: maxLevel,
          userMinLevel: minUserLevel,
          path: req.path,
          method: req.method,
        });
        throw new ForbiddenException('Access denied. Insufficient privileges.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if the action is implied by the "manage" permission.
 * "manage" means full control - it implies all other actions.
 */
const isActionImpliedByManage = (action: string): boolean => {
  const impliedActions = [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.MESSAGE,
    PermissionAction.ASSIGN,
    PermissionAction.NOTE,
  ];
  return impliedActions.includes(action as PermissionAction);
};

/**
 * Check if user has a specific permission.
 * Supports "manage" as wildcard (implies all other actions).
 */
export const requirePermission = (
  resource: string,
  action: string,
  scope: string = 'all'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User | undefined;

      if (!user) {
        throw new ForbiddenException('Authentication required');
      }

      const permissionService = container.resolve(PermissionService);
      const requiredPermission = `${resource}:${action}:${scope}`;

      // Check exact permission
      let hasPermission = await permissionService.hasPermission(
        user.id,
        requiredPermission
      );

      // If not found and action is not "manage", check if user has "manage" permission
      if (!hasPermission && action !== PermissionAction.MANAGE && isActionImpliedByManage(action)) {
        const managePermission = `${resource}:${PermissionAction.MANAGE}:${scope}`;
        hasPermission = await permissionService.hasPermission(user.id, managePermission);
      }

      // If scope is "own", also check "all" scope (all implies own)
      if (!hasPermission && scope === 'own') {
        const allScopePermission = `${resource}:${action}:all`;
        hasPermission = await permissionService.hasPermission(user.id, allScopePermission);

        // Also check manage:all
        if (!hasPermission && action !== PermissionAction.MANAGE && isActionImpliedByManage(action)) {
          const manageAllPermission = `${resource}:${PermissionAction.MANAGE}:all`;
          hasPermission = await permissionService.hasPermission(user.id, manageAllPermission);
        }
      }

      if (!hasPermission) {
        auditLogger.warn('Authorization failed: missing permission', {
          userId: user.id,
          email: user.email,
          requiredPermission,
          path: req.path,
          method: req.method,
        });
        throw new ForbiddenException(
          `Access denied. Required permission: ${requiredPermission}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has any of the specified permissions
 */
export const requireAnyPermission = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User | undefined;

      if (!user) {
        throw new ForbiddenException('Authentication required');
      }

      const permissionService = container.resolve(PermissionService);
      const hasAny = await permissionService.hasAnyPermission(user.id, permissions);

      if (!hasAny) {
        auditLogger.warn('Authorization failed: missing any permission', {
          userId: user.id,
          email: user.email,
          requiredPermissions: permissions,
          path: req.path,
          method: req.method,
        });
        throw new ForbiddenException(
          `Access denied. Required one of: ${permissions.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has all of the specified permissions
 */
export const requireAllPermissions = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User | undefined;

      if (!user) {
        throw new ForbiddenException('Authentication required');
      }

      const permissionService = container.resolve(PermissionService);
      const hasAll = await permissionService.hasAllPermissions(user.id, permissions);

      if (!hasAll) {
        auditLogger.warn('Authorization failed: missing all permissions', {
          userId: user.id,
          email: user.email,
          requiredPermissions: permissions,
          path: req.path,
          method: req.method,
        });
        throw new ForbiddenException(
          `Access denied. Required all of: ${permissions.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user is the owner of the resource or has admin privileges
 * Useful for "own" scope permissions
 */
export const requireOwnerOrPermission = (
  resource: string,
  action: string,
  getOwnerId: (req: Request) => string | Promise<string>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User | undefined;

      if (!user) {
        throw new ForbiddenException('Authentication required');
      }

      const ownerId = await getOwnerId(req);
      const isOwner = user.id === ownerId;

      if (isOwner) {
        // User is the owner, check "own" scope permission
        const permissionService = container.resolve(PermissionService);
        const ownPermission = `${resource}:${action}:own`;
        const hasOwnPermission = await permissionService.hasPermission(user.id, ownPermission);

        if (hasOwnPermission) {
          return next();
        }
      }

      // Not owner or doesn't have own permission, check "all" scope
      const permissionService = container.resolve(PermissionService);
      const allPermission = `${resource}:${action}:all`;
      const hasAllPermission = await permissionService.hasPermission(user.id, allPermission);

      if (!hasAllPermission) {
        // Also check manage permission
        const managePermission = `${resource}:${PermissionAction.MANAGE}:all`;
        const hasManagePermission = await permissionService.hasPermission(user.id, managePermission);

        if (!hasManagePermission) {
          auditLogger.warn('Authorization failed: not owner and missing permission', {
            userId: user.id,
            email: user.email,
            resourceOwnerId: ownerId,
            resource,
            action,
            path: req.path,
            method: req.method,
          });
          throw new ForbiddenException('Access denied. You can only access your own resources.');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
