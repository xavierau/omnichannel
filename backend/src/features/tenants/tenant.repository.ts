import { singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database.config';
import { Tenant } from './tenant.entity';

@singleton()
export class TenantRepository {
  private _repository: Repository<Tenant> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<Tenant> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(Tenant);
    }
    return this._repository;
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async findAll(): Promise<Tenant[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.repository.create(data);
    return this.repository.save(tenant);
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('tenant')
      .where('tenant.slug = :slug', { slug });

    if (excludeId) {
      query.andWhere('tenant.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
