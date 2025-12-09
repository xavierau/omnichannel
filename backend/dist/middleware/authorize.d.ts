import { Request, Response, NextFunction } from 'express';
/**
 * Permission string format: "resource:action:scope"
 * Examples: "users:read:all", "broadcasts:create:own", "customers:manage:all"
 */
export type PermissionString = `${string}:${string}:${string}`;
/**
 * Role levels (lower number = more privileged)
 */
export declare const RoleLevel: {
    readonly SUPER_ADMIN: 1;
    readonly ADMIN: 2;
    readonly MANAGER: 3;
    readonly AGENT: 4;
};
/**
 * Check if user has any of the specified roles
 */
export declare const requireRole: (...roleNames: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has a role with level <= maxLevel (lower = more privileged)
 * Level 1 = super_admin, Level 2 = admin, Level 3 = manager, Level 4 = agent
 */
export declare const requireRoleLevel: (maxLevel: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has a specific permission.
 * Supports "manage" as wildcard (implies all other actions).
 */
export declare const requirePermission: (resource: string, action: string, scope?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has any of the specified permissions
 */
export declare const requireAnyPermission: (...permissions: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has all of the specified permissions
 */
export declare const requireAllPermissions: (...permissions: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user is the owner of the resource or has admin privileges
 * Useful for "own" scope permissions
 */
export declare const requireOwnerOrPermission: (resource: string, action: string, getOwnerId: (req: Request) => string | Promise<string>) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
