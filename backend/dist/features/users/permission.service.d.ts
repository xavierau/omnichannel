import { UserRepository } from './user.repository';
export declare class PermissionService {
    private userRepo;
    constructor(userRepo: UserRepository);
    /**
     * Get all permissions for a user from their roles
     */
    getUserPermissions(userId: string): Promise<string[]>;
    /**
     * Check if a user has a specific permission
     */
    hasPermission(userId: string, requiredPermission: string): Promise<boolean>;
    /**
     * Check if a user has ANY of the specified permissions
     */
    hasAnyPermission(userId: string, requiredPermissions: string[]): Promise<boolean>;
    /**
     * Check if a user has ALL of the specified permissions
     */
    hasAllPermissions(userId: string, requiredPermissions: string[]): Promise<boolean>;
}
