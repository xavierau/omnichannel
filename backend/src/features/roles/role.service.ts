import { inject, singleton } from 'tsyringe';
import { RoleRepository } from './role.repository';
import { Role } from './role.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@shared/exceptions/http-exceptions';
import { redisClient } from '@config/redis.config';
import { auditLogger } from '@config/logger.config';

@singleton()
export class RoleService {
  constructor(@inject(RoleRepository) private roleRepo: RoleRepository) {}

  async findAll(options?: { includePermissions?: boolean }): Promise<Role[]> {
    return this.roleRepo.findAll(options);
  }

  async findById(id: string): Promise<Role> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findByName(name);
  }

  async create(data: CreateRoleDto, createdBy?: string): Promise<Role> {
    // Check if role name already exists
    const existing = await this.roleRepo.findByName(data.name);
    if (existing) {
      throw new BadRequestException(`Role with name '${data.name}' already exists`);
    }

    const role = await this.roleRepo.create({
      name: data.name,
      displayName: data.displayName,
      description: data.description || null,
      level: data.level,
      isSystem: data.isSystem || false,
    });

    auditLogger.info('Role created', {
      roleId: role.id,
      roleName: role.name,
      createdBy,
    });

    return role;
  }

  async update(id: string, data: UpdateRoleDto, updatedBy?: string): Promise<Role> {
    const role = await this.findById(id);

    // Prevent modifying system roles' name
    if (role.isSystem && data.name && data.name !== role.name) {
      throw new ForbiddenException('Cannot modify the name of a system role');
    }

    // Check if new name conflicts with existing role
    if (data.name && data.name !== role.name) {
      const existing = await this.roleRepo.findByName(data.name);
      if (existing) {
        throw new BadRequestException(`Role with name '${data.name}' already exists`);
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

    auditLogger.info('Role updated', {
      roleId: id,
      roleName: updatedRole.name,
      changes: data,
      updatedBy,
    });

    return updatedRole;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const role = await this.findById(id);

    // Prevent deleting system roles
    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete a system role');
    }

    // Check if role has users assigned
    const userCount = await this.roleRepo.countUsersWithRole(id);
    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because it is assigned to ${userCount} user(s). Remove users from this role first.`
      );
    }

    await this.roleRepo.delete(id);

    auditLogger.info('Role deleted', {
      roleId: id,
      roleName: role.name,
      deletedBy,
    });
  }

  async addPermissions(
    roleId: string,
    permissionIds: string[],
    updatedBy?: string
  ): Promise<Role> {
    const role = await this.findById(roleId);

    const updatedRole = await this.roleRepo.addPermissions(roleId, permissionIds);

    // Invalidate cached user permissions
    await this.invalidateRoleCache(roleId);

    auditLogger.info('Permissions added to role', {
      roleId,
      roleName: role.name,
      addedPermissionIds: permissionIds,
      updatedBy,
    });

    return updatedRole;
  }

  async removePermissions(
    roleId: string,
    permissionIds: string[],
    updatedBy?: string
  ): Promise<Role> {
    const role = await this.findById(roleId);

    const updatedRole = await this.roleRepo.removePermissions(roleId, permissionIds);

    // Invalidate cached user permissions
    await this.invalidateRoleCache(roleId);

    auditLogger.info('Permissions removed from role', {
      roleId,
      roleName: role.name,
      removedPermissionIds: permissionIds,
      updatedBy,
    });

    return updatedRole;
  }

  async syncPermissions(
    roleId: string,
    permissionIds: string[],
    updatedBy?: string
  ): Promise<Role> {
    const role = await this.findById(roleId);

    const updatedRole = await this.roleRepo.syncPermissions(roleId, permissionIds);

    // Invalidate cached user permissions
    await this.invalidateRoleCache(roleId);

    auditLogger.info('Permissions synced for role', {
      roleId,
      roleName: role.name,
      newPermissionIds: permissionIds,
      updatedBy,
    });

    return updatedRole;
  }

  async getUserCount(roleId: string): Promise<number> {
    await this.findById(roleId); // Ensure role exists
    return this.roleRepo.countUsersWithRole(roleId);
  }

  /**
   * Invalidate Redis cache for all users with this role
   */
  private async invalidateRoleCache(roleId: string): Promise<void> {
    try {
      // Get all user keys and delete those associated with this role
      // In production, consider using a more efficient approach with role-based cache keys
      const keys = await redisClient.keys('user:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      // Log but don't fail the operation if cache invalidation fails
      auditLogger.warn('Failed to invalidate role cache', {
        roleId,
        error: (error as Error).message,
      });
    }
  }
}
