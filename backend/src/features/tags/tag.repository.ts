import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { Tag } from './tag.entity';

@singleton()
export class TagRepository {
  private repository: Repository<Tag>;

  constructor() {
    this.repository = AppDataSource.getRepository(Tag);
  }

  async findById(id: string, tenantId: string): Promise<Tag | null> {
    return this.repository.findOne({
      where: { id, tenantId },
    });
  }

  async findByIds(ids: string[], tenantId: string): Promise<Tag[]> {
    if (ids.length === 0) return [];

    return this.repository
      .createQueryBuilder('tag')
      .where('tag.id IN (:...ids)', { ids })
      .andWhere('tag.tenant_id = :tenantId', { tenantId })
      .getMany();
  }

  async findByTenantId(tenantId: string): Promise<Tag[]> {
    return this.repository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findByName(name: string, tenantId: string): Promise<Tag | null> {
    return this.repository.findOne({
      where: { name, tenantId },
    });
  }

  async create(data: Partial<Tag>): Promise<Tag> {
    const tag = this.repository.create(data);
    return this.repository.save(tag);
  }

  async update(id: string, tenantId: string, data: Partial<Tag>): Promise<Tag | null> {
    await this.repository.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async existsByName(name: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('tag')
      .where('tag.name = :name', { name })
      .andWhere('tag.tenant_id = :tenantId', { tenantId });

    if (excludeId) {
      query.andWhere('tag.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
