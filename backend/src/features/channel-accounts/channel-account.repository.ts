import { singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database.config';
import { ChannelAccount, ChannelAccountStatus } from './channel-account.entity';

/**
 * Query options for channel accounts.
 */
export interface ChannelAccountQueryOptions {
  channelCode?: string;
  isActive?: boolean;
}

@singleton()
export class ChannelAccountRepository {
  private repository: Repository<ChannelAccount>;

  constructor() {
    this.repository = AppDataSource.getRepository(ChannelAccount);
  }

  /**
   * Find all channel accounts for a tenant.
   */
  async findByTenant(
    tenantId: string,
    options?: ChannelAccountQueryOptions
  ): Promise<ChannelAccount[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.channel', 'channel')
      .leftJoinAndSelect('account.provider', 'provider')
      .where('account.tenant_id = :tenantId', { tenantId });

    if (options?.channelCode) {
      queryBuilder.andWhere('channel.code = :channelCode', {
        channelCode: options.channelCode,
      });
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('account.is_active = :isActive', {
        isActive: options.isActive,
      });
    }

    return queryBuilder.orderBy('account.name', 'ASC').getMany();
  }

  /**
   * Find a channel account by ID.
   */
  async findById(id: string): Promise<ChannelAccount | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['channel', 'provider'],
    });
  }

  /**
   * Find a channel account by ID for a specific tenant.
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<ChannelAccount | null> {
    return this.repository.findOne({
      where: { id, tenantId },
      relations: ['channel', 'provider'],
    });
  }

  /**
   * Find primary channel account for a tenant and channel.
   */
  async findPrimaryByTenantAndChannel(
    tenantId: string,
    channelCode: string
  ): Promise<ChannelAccount | null> {
    return this.repository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.channel', 'channel')
      .leftJoinAndSelect('account.provider', 'provider')
      .where('account.tenant_id = :tenantId', { tenantId })
      .andWhere('channel.code = :channelCode', { channelCode })
      .andWhere('account.is_primary = :isPrimary', { isPrimary: true })
      .andWhere('account.is_active = :isActive', { isActive: true })
      .getOne();
  }

  /**
   * Create a new channel account.
   */
  async create(data: Partial<ChannelAccount>): Promise<ChannelAccount> {
    const account = this.repository.create(data);
    return this.repository.save(account);
  }

  /**
   * Update a channel account.
   */
  async update(
    id: string,
    tenantId: string,
    data: Partial<ChannelAccount>
  ): Promise<ChannelAccount | null> {
    const account = await this.findByIdAndTenant(id, tenantId);
    if (!account) {
      return null;
    }

    Object.assign(account, data);
    return this.repository.save(account);
  }

  /**
   * Delete a channel account.
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, tenantId });
    return result.affected !== 0;
  }

  /**
   * Update connection status.
   */
  async updateStatus(
    id: string,
    status: ChannelAccountStatus,
    errorMessage?: string
  ): Promise<void> {
    await this.repository.update(id, {
      status,
      errorMessage: errorMessage || null,
      lastTestedAt: new Date(),
    });
  }

  /**
   * Set a channel account as primary (and unset others for same channel).
   */
  async setPrimary(id: string, tenantId: string): Promise<boolean> {
    const account = await this.findByIdAndTenant(id, tenantId);
    if (!account) {
      return false;
    }

    // Unset primary for all other accounts of same channel
    await this.repository
      .createQueryBuilder()
      .update(ChannelAccount)
      .set({ isPrimary: false })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('channel_id = :channelId', { channelId: account.channelId })
      .andWhere('id != :id', { id })
      .execute();

    // Set this account as primary
    await this.repository.update(id, { isPrimary: true });

    return true;
  }

  /**
   * Count channel accounts for a tenant.
   */
  async countByTenant(tenantId: string): Promise<number> {
    return this.repository.count({ where: { tenantId } });
  }
}
