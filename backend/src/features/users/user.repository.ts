import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { User } from './user.entity';

@singleton()
export class UserRepository {
  private _repository: Repository<User> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   * This prevents errors when the DI container instantiates this class before
   * the database connection is established.
   */
  private get repository(): Repository<User> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(User);
    }
    return this._repository;
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.repository.update(id, userData);
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new Error('User not found after update');
    }
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    status?: string;
  }): Promise<[User[], number]> {
    const query = this.repository.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions');

    if (options?.status) {
      query.where('user.status = :status', { status: options.status });
    }

    if (options?.skip) {
      query.skip(options.skip);
    }

    if (options?.take) {
      query.take(options.take);
    }

    return query.getManyAndCount();
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  /**
   * Find users by tenant ID who can be assigned inbox conversations.
   * Includes users who belong to active teams within the tenant.
   *
   * @param tenantId - The tenant ID for isolation
   * @returns Array of users with inbox access
   */
  async findOperatorsByTenant(tenantId: string): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .innerJoin('team_members', 'tm', 'tm.user_id = user.id')
      .innerJoin('teams', 't', 't.id = tm.team_id')
      .where('user.tenant_id = :tenantId', { tenantId })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('t.is_active = :isActive', { isActive: true })
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
      ])
      .distinct(true)
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC')
      .getMany();
  }
}
