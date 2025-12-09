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
  private _repository: Repository<ChannelAccount> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   * This prevents errors when the DI container instantiates this class before
   * the database connection is established.
   */
  private get repository(): Repository<ChannelAccount> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(ChannelAccount);
    }
    return this._repository;
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

  /**
   * Find an active channel account by its provider phone number ID.
   *
   * This is the primary lookup method for routing inbound webhook events.
   * Only returns active accounts to prevent message delivery to disabled accounts.
   *
   * @param phoneNumberId - The provider's phone number ID (e.g., Meta's phone_number_id)
   * @returns The active channel account or null if not found
   */
  async findByPhoneNumberId(phoneNumberId: string): Promise<ChannelAccount | null> {
    return this.repository.findOne({
      where: {
        phoneNumberId,
        isActive: true,
      },
      relations: ['channel', 'provider'],
    });
  }

  /**
   * Update webhook configuration for a channel account.
   *
   * Stores the encrypted verify token for webhook verification.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @param encryptedSecret - Encrypted webhook secret/verify token
   * @param secretIv - Initialization vector for encryption
   */
  async updateWebhookConfig(
    id: string,
    tenantId: string,
    encryptedSecret: string,
    secretIv: string
  ): Promise<void> {
    await this.repository.update(
      { id, tenantId },
      {
        webhookSecretEncrypted: encryptedSecret,
        webhookSecretIv: secretIv,
      }
    );
  }

  /**
   * Find all active channel accounts.
   *
   * Used for batch operations like template status webhook processing
   * where we need to check credentials across all accounts.
   *
   * @returns All active channel accounts with relations
   */
  async findAllActive(): Promise<ChannelAccount[]> {
    return this.repository.find({
      where: { isActive: true },
      relations: ['channel', 'provider'],
    });
  }

  /**
   * Find all channel accounts that have webhook configuration.
   *
   * Used for webhook verification to check stored verify tokens.
   * Only returns accounts with encrypted webhook secrets.
   *
   * @returns Channel accounts with webhook config
   */
  async findAllWithWebhookConfig(): Promise<ChannelAccount[]> {
    return this.repository
      .createQueryBuilder('account')
      .where('account.webhook_secret_encrypted IS NOT NULL')
      .andWhere('account.webhook_secret_iv IS NOT NULL')
      .andWhere('account.is_active = :isActive', { isActive: true })
      .getMany();
  }
}
