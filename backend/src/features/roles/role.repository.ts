import { singleton } from 'tsyringe';
import { Repository, In } from 'typeorm';
import { AppDataSource } from '@config/database.config';
import { Role } from './role.entity';
import { Permission } from '@features/permissions/permission.entity';

@singleton()
export class RoleRepository {
  private repo: Repository<Role>;

  constructor() {
    this.repo = AppDataSource.getRepository(Role);
  }

  async findAll(options?: { includePermissions?: boolean }): Promise<Role[]> {
    return this.repo.find({
      relations: options?.includePermissions ? ['permissions'] : [],
      order: { level: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Role | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['permissions'],
    });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.repo.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  async findByLevel(level: number): Promise<Role[]> {
    return this.repo.find({
      where: { level },
      relations: ['permissions'],
    });
  }

  async findByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) return [];
    return this.repo.findByIds(ids);
  }

  async create(data: {
    name: string;
    displayName: string;
    description?: string | null;
    level: number;
    isSystem?: boolean;
  }): Promise<Role> {
    const role = this.repo.create({
      name: data.name,
      displayName: data.displayName,
      description: data.description || null,
      level: data.level,
      isSystem: data.isSystem || false,
      permissions: [],
    });

    return this.repo.save(role);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      displayName: string;
      description: string | null;
      level: number;
    }>
  ): Promise<Role> {
    await this.repo.update(id, data);
    const role = await this.findById(id);
    if (!role) {
      throw new Error('Role not found after update');
    }
    return role;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async addPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.repo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Get permission repository
    const permissionRepo = AppDataSource.getRepository(Permission);
    const permissions = await permissionRepo.find({ where: { id: In(permissionIds) } });

    // Add new permissions (avoid duplicates)
    const existingIds = new Set(role.permissions.map((p) => p.id));
    for (const permission of permissions) {
      if (!existingIds.has(permission.id)) {
        role.permissions.push(permission);
      }
    }

    return this.repo.save(role);
  }

  async removePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.repo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new Error('Role not found');
    }

    const idsToRemove = new Set(permissionIds);
    role.permissions = role.permissions.filter((p) => !idsToRemove.has(p.id));

    return this.repo.save(role);
  }

  async syncPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.repo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (permissionIds.length === 0) {
      role.permissions = [];
    } else {
      const permissionRepo = AppDataSource.getRepository(Permission);
      const permissions = await permissionRepo.find({ where: { id: In(permissionIds) } });
      role.permissions = permissions;
    }

    return this.repo.save(role);
  }

  async countUsersWithRole(roleId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('role')
      .leftJoin('role.users', 'user')
      .where('role.id = :roleId', { roleId })
      .select('COUNT(DISTINCT user.id)', 'count')
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }
}
