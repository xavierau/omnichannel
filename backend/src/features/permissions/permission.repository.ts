import { singleton } from 'tsyringe';
import { Repository, In } from 'typeorm';
import { AppDataSource } from '@config/database.config';
import { Permission, PermissionResource, PermissionAction, PermissionScope } from './permission.entity';

@singleton()
export class PermissionRepository {
  private _repo: Repository<Permission> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repo(): Repository<Permission> {
    if (!this._repo) {
      this._repo = AppDataSource.getRepository(Permission);
    }
    return this._repo;
  }

  async findAll(options?: {
    resource?: PermissionResource;
    action?: PermissionAction;
  }): Promise<Permission[]> {
    const where: any = {};

    if (options?.resource) {
      where.resource = options.resource;
    }
    if (options?.action) {
      where.action = options.action;
    }

    return this.repo.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { resource: 'ASC', action: 'ASC', scope: 'ASC' },
    });
  }

  async findById(id: string): Promise<Permission | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    if (ids.length === 0) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findByResourceAction(
    resource: PermissionResource,
    action: PermissionAction,
    scope?: PermissionScope
  ): Promise<Permission | null> {
    const where: any = { resource, action };
    if (scope) {
      where.scope = scope;
    }
    return this.repo.findOne({ where });
  }

  async findByResourceActionScope(
    resource: PermissionResource,
    action: PermissionAction,
    scope: PermissionScope
  ): Promise<Permission | null> {
    return this.repo.findOne({
      where: { resource, action, scope },
    });
  }

  async create(data: {
    resource: PermissionResource;
    action: PermissionAction;
    scope: PermissionScope;
    description?: string | null;
  }): Promise<Permission> {
    const permission = this.repo.create({
      resource: data.resource,
      action: data.action,
      scope: data.scope,
      description: data.description || null,
    });

    return this.repo.save(permission);
  }

  async bulkCreate(
    data: Array<{
      resource: PermissionResource;
      action: PermissionAction;
      scope: PermissionScope;
      description?: string | null;
    }>
  ): Promise<Permission[]> {
    const permissions = data.map((d) =>
      this.repo.create({
        resource: d.resource,
        action: d.action,
        scope: d.scope,
        description: d.description || null,
      })
    );

    return this.repo.save(permissions);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getAllGroupedByResource(): Promise<Map<PermissionResource, Permission[]>> {
    const permissions = await this.findAll();
    const grouped = new Map<PermissionResource, Permission[]>();

    for (const permission of permissions) {
      const existing = grouped.get(permission.resource) || [];
      existing.push(permission);
      grouped.set(permission.resource, existing);
    }

    return grouped;
  }

  async count(): Promise<number> {
    return this.repo.count();
  }
}
