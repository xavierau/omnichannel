import { inject, singleton } from 'tsyringe';
import { UserRepository } from './user.repository';

@singleton()
export class PermissionService {
  constructor(@inject(UserRepository) private userRepo: UserRepository) {}

  /**
   * Get all permissions for a user from their roles
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepo.findById(userId);

    if (!user || !user.roles) {
      return [];
    }

    const permissions: string[] = [];

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
  async hasPermission(userId: string, requiredPermission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(requiredPermission);
  }

  /**
   * Check if a user has ANY of the specified permissions
   */
  async hasAnyPermission(userId: string, requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return requiredPermissions.some((required) => permissions.includes(required));
  }

  /**
   * Check if a user has ALL of the specified permissions
   */
  async hasAllPermissions(userId: string, requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return requiredPermissions.every((required) => permissions.includes(required));
  }
}
