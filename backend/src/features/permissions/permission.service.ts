import { inject, singleton } from 'tsyringe';
import { PermissionRepository } from './permission.repository';
import {
  Permission,
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from './permission.entity';
import { CreatePermissionDto } from './dto/permission.dto';
import { BadRequestException, NotFoundException } from '@shared/exceptions/http-exceptions';
import { auditLogger } from '@config/logger.config';

@singleton()
export class PermissionCrudService {
  constructor(@inject(PermissionRepository) private permissionRepo: PermissionRepository) {}

  async findAll(options?: {
    resource?: PermissionResource;
    action?: PermissionAction;
  }): Promise<Permission[]> {
    return this.permissionRepo.findAll(options);
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return this.permissionRepo.findByIds(ids);
  }

  async getPermissionsByResource(resource: PermissionResource): Promise<Permission[]> {
    return this.permissionRepo.findAll({ resource });
  }

  async getAllGroupedByResource(): Promise<Map<PermissionResource, Permission[]>> {
    return this.permissionRepo.getAllGroupedByResource();
  }

  async create(data: CreatePermissionDto, createdBy?: string): Promise<Permission> {
    // Check if permission already exists
    const existing = await this.permissionRepo.findByResourceActionScope(
      data.resource,
      data.action,
      data.scope
    );

    if (existing) {
      throw new BadRequestException(
        `Permission '${data.resource}:${data.action}:${data.scope}' already exists`
      );
    }

    const permission = await this.permissionRepo.create({
      resource: data.resource,
      action: data.action,
      scope: data.scope,
      description: data.description || null,
    });

    auditLogger.info('Permission created', {
      permissionId: permission.id,
      permission: `${permission.resource}:${permission.action}:${permission.scope}`,
      createdBy,
    });

    return permission;
  }

  async bulkCreate(
    data: CreatePermissionDto[],
    createdBy?: string
  ): Promise<Permission[]> {
    // Filter out existing permissions
    const toCreate: CreatePermissionDto[] = [];

    for (const item of data) {
      const existing = await this.permissionRepo.findByResourceActionScope(
        item.resource,
        item.action,
        item.scope
      );

      if (!existing) {
        toCreate.push(item);
      }
    }

    if (toCreate.length === 0) {
      return [];
    }

    const permissions = await this.permissionRepo.bulkCreate(
      toCreate.map((d) => ({
        resource: d.resource,
        action: d.action,
        scope: d.scope,
        description: d.description || null,
      }))
    );

    auditLogger.info('Permissions bulk created', {
      count: permissions.length,
      permissions: permissions.map((p) => `${p.resource}:${p.action}:${p.scope}`),
      createdBy,
    });

    return permissions;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const permission = await this.findById(id);

    await this.permissionRepo.delete(id);

    auditLogger.info('Permission deleted', {
      permissionId: id,
      permission: `${permission.resource}:${permission.action}:${permission.scope}`,
      deletedBy,
    });
  }

  /**
   * Get all available resources
   */
  getAvailableResources(): PermissionResource[] {
    return Object.values(PermissionResource);
  }

  /**
   * Get all available actions
   */
  getAvailableActions(): PermissionAction[] {
    return Object.values(PermissionAction);
  }

  /**
   * Get all available scopes
   */
  getAvailableScopes(): PermissionScope[] {
    return Object.values(PermissionScope);
  }

  /**
   * Get count of all permissions
   */
  async count(): Promise<number> {
    return this.permissionRepo.count();
  }
}
