import { singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database.config';
import { Provider } from './provider.entity';

@singleton()
export class ProviderRepository {
  private _repository: Repository<Provider> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<Provider> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(Provider);
    }
    return this._repository;
  }

  async findAll(): Promise<Provider[]> {
    return this.repository.find({
      relations: ['channel'],
      order: { name: 'ASC' },
    });
  }

  async findActive(): Promise<Provider[]> {
    return this.repository.find({
      where: { isActive: true },
      relations: ['channel'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Provider | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['channel'],
    });
  }

  async findByCode(code: string): Promise<Provider | null> {
    return this.repository.findOne({
      where: { code },
      relations: ['channel'],
    });
  }

  async findByCodeOrFail(code: string): Promise<Provider> {
    const provider = await this.findByCode(code);
    if (!provider) {
      throw new Error(`Provider with code '${code}' not found`);
    }
    return provider;
  }

  async findByChannelId(channelId: string): Promise<Provider[]> {
    return this.repository.find({
      where: { channelId, isActive: true },
      relations: ['channel'],
      order: { name: 'ASC' },
    });
  }

  async findByChannel(
    channelId: string,
    options?: { isActive?: boolean }
  ): Promise<Provider[]> {
    const where: { channelId: string; isActive?: boolean } = { channelId };
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    return this.repository.find({
      where,
      relations: ['channel'],
      order: { name: 'ASC' },
    });
  }

  async findByChannelCode(channelCode: string): Promise<Provider[]> {
    return this.repository
      .createQueryBuilder('provider')
      .innerJoin('provider.channel', 'channel')
      .where('channel.code = :channelCode', { channelCode })
      .andWhere('provider.is_active = :isActive', { isActive: true })
      .orderBy('provider.name', 'ASC')
      .getMany();
  }
}
