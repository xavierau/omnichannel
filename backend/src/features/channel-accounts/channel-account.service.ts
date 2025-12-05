import { singleton, inject } from 'tsyringe';
import { ChannelAccountRepository } from './channel-account.repository';
import { ChannelAccount, ChannelAccountStatus } from './channel-account.entity';
import { ChannelRepository } from '../channels/channel.repository';
import { ProviderRepository } from '../providers/provider.repository';
import { CredentialService } from '../messaging/services/credential.service';
import { MessagingService } from '../messaging/services/messaging.service';
import { ProviderCredentials } from '../messaging/interfaces/messaging-provider.interface';
import { logger } from '../../config/logger.config';

/**
 * DTO for creating a channel account.
 * Credentials are provider-specific based on the provider's config_schema.
 */
export interface CreateChannelAccountDto {
  name: string;
  phoneNumber?: string;
  channelCode: string; // e.g., 'whatsapp'
  providerCode?: string; // e.g., 'meta_cloud_api' - defaults to primary provider for channel
  credentials: ProviderCredentials;
  isActive?: boolean;
  isPrimary?: boolean;
}

/**
 * DTO for updating a channel account.
 */
export interface UpdateChannelAccountDto {
  name?: string;
  phoneNumber?: string;
  credentials?: ProviderCredentials;
  isActive?: boolean;
  isPrimary?: boolean;
}

/**
 * Response DTO for channel accounts (excludes sensitive data).
 */
export interface ChannelAccountResponse {
  id: string;
  name: string;
  phoneNumber: string | null;
  channelCode: string;
  channelName: string;
  providerCode: string;
  providerName: string;
  isActive: boolean;
  isPrimary: boolean;
  status: ChannelAccountStatus;
  lastTestedAt: Date | null;
  errorMessage: string | null;
  webhookUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Non-sensitive credential info for display
  credentials?: {
    phoneNumberId?: string;
    whatsappBusinessAccountId?: string;
    appId?: string;
  };
}

/**
 * Service for managing channel accounts.
 *
 * Handles CRUD operations with credential encryption/decryption.
 */
@singleton()
export class ChannelAccountService {
  constructor(
    @inject(ChannelAccountRepository) private channelAccountRepo: ChannelAccountRepository,
    @inject(ChannelRepository) private channelRepo: ChannelRepository,
    @inject(ProviderRepository) private providerRepo: ProviderRepository,
    @inject(CredentialService) private credentialService: CredentialService,
    @inject(MessagingService) private messagingService: MessagingService
  ) {}

  /**
   * Get all channel accounts for a tenant.
   *
   * @param tenantId - Tenant ID
   * @param channelCode - Optional channel filter
   * @returns List of channel accounts (without sensitive data)
   */
  async getByTenant(
    tenantId: string,
    channelCode?: string
  ): Promise<ChannelAccountResponse[]> {
    const accounts = await this.channelAccountRepo.findByTenant(tenantId, {
      channelCode,
    });

    return accounts.map((account) => this.toResponse(account));
  }

  /**
   * Get a channel account by ID.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns Channel account or null
   */
  async getById(id: string, tenantId: string): Promise<ChannelAccountResponse | null> {
    const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);

    if (!account) {
      return null;
    }

    return this.toResponse(account);
  }

  /**
   * Get a channel account with decrypted credentials (for internal use).
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns Channel account with credentials or null
   */
  async getWithCredentials(
    id: string,
    tenantId: string
  ): Promise<{ account: ChannelAccount; credentials: ProviderCredentials } | null> {
    const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);

    if (!account) {
      return null;
    }

    const credentials = await this.credentialService.decryptCredentials(
      account.encryptedCredentials,
      account.credentialsIv
    );

    return { account, credentials };
  }

  /**
   * Create a new channel account.
   *
   * @param tenantId - Tenant ID
   * @param dto - Creation data
   * @returns Created channel account
   */
  async create(
    tenantId: string,
    dto: CreateChannelAccountDto
  ): Promise<ChannelAccountResponse> {
    // 1. Validate channel exists
    const channel = await this.channelRepo.findByCode(dto.channelCode);
    if (!channel) {
      throw new Error(`Channel '${dto.channelCode}' not found`);
    }

    if (!channel.isActive) {
      throw new Error(`Channel '${dto.channelCode}' is not active`);
    }

    // 2. Resolve provider
    let provider;
    if (dto.providerCode) {
      provider = await this.providerRepo.findByCode(dto.providerCode);
      if (!provider) {
        throw new Error(`Provider '${dto.providerCode}' not found`);
      }
    } else {
      // Get default provider for channel
      const providers = await this.providerRepo.findByChannel(channel.id, { isActive: true });
      provider = providers[0];
      if (!provider) {
        throw new Error(`No active provider available for channel '${dto.channelCode}'`);
      }
    }

    if (provider.channelId !== channel.id) {
      throw new Error(
        `Provider '${provider.code}' does not support channel '${dto.channelCode}'`
      );
    }

    // 3. Validate credentials against provider schema
    this.validateCredentials(dto.credentials, provider.configSchema);

    // 4. Encrypt credentials
    const { encrypted, iv } = await this.credentialService.encryptCredentials(
      dto.credentials
    );

    // 5. Create channel account
    const account = await this.channelAccountRepo.create({
      tenantId,
      channelId: channel.id,
      providerId: provider.id,
      name: dto.name,
      phoneNumber: dto.phoneNumber || null,
      encryptedCredentials: encrypted,
      credentialsIv: iv,
      isActive: dto.isActive ?? true,
      isPrimary: dto.isPrimary ?? false,
      status: ChannelAccountStatus.DISCONNECTED,
    });

    // 6. If isPrimary, unset other primary accounts
    if (dto.isPrimary) {
      await this.channelAccountRepo.setPrimary(account.id, tenantId);
    }

    // 7. Test connection in background
    this.testConnectionAsync(account.id, tenantId);

    logger.info('Channel account created', {
      channelAccountId: account.id,
      tenantId,
      channelCode: dto.channelCode,
      providerCode: provider.code,
    });

    // Fetch with relations for response
    const created = await this.channelAccountRepo.findByIdAndTenant(account.id, tenantId);
    return this.toResponse(created!);
  }

  /**
   * Update a channel account.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @param dto - Update data
   * @returns Updated channel account
   */
  async update(
    id: string,
    tenantId: string,
    dto: UpdateChannelAccountDto
  ): Promise<ChannelAccountResponse | null> {
    const existing = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
    if (!existing) {
      return null;
    }

    const updateData: Partial<ChannelAccount> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.phoneNumber !== undefined) {
      updateData.phoneNumber = dto.phoneNumber;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    // Handle credentials update
    if (dto.credentials) {
      const provider = await this.providerRepo.findById(existing.providerId);
      if (provider) {
        this.validateCredentials(dto.credentials, provider.configSchema);
      }

      const { encrypted, iv } = await this.credentialService.encryptCredentials(
        dto.credentials
      );
      updateData.encryptedCredentials = encrypted;
      updateData.credentialsIv = iv;

      // Reset status to disconnected when credentials change
      updateData.status = ChannelAccountStatus.DISCONNECTED;
    }

    // Update the account
    const updated = await this.channelAccountRepo.update(id, tenantId, updateData);
    if (!updated) {
      return null;
    }

    // Handle isPrimary change
    if (dto.isPrimary === true) {
      await this.channelAccountRepo.setPrimary(id, tenantId);
    }

    // Test connection if credentials changed
    if (dto.credentials) {
      this.testConnectionAsync(id, tenantId);
    }

    logger.info('Channel account updated', {
      channelAccountId: id,
      tenantId,
      fieldsUpdated: Object.keys(updateData),
    });

    // Fetch fresh with relations
    const result = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
    return this.toResponse(result!);
  }

  /**
   * Delete a channel account.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns true if deleted
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const deleted = await this.channelAccountRepo.delete(id, tenantId);

    if (deleted) {
      logger.info('Channel account deleted', {
        channelAccountId: id,
        tenantId,
      });
    }

    return deleted;
  }

  /**
   * Test connection to the provider.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns Test result
   */
  async testConnection(
    id: string,
    tenantId: string
  ): Promise<{ success: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
    const result = await this.messagingService.verifyChannelAccountCredentials(
      id,
      tenantId
    );

    // Update status based on result
    const status = result.valid
      ? ChannelAccountStatus.CONNECTED
      : ChannelAccountStatus.ERROR;

    await this.channelAccountRepo.updateStatus(
      id,
      status,
      result.valid ? undefined : result.error
    );

    logger.info('Channel account connection tested', {
      channelAccountId: id,
      tenantId,
      success: result.valid,
      error: result.error,
    });

    return {
      success: result.valid,
      error: result.error,
      accountInfo: result.accountInfo,
    };
  }

  /**
   * Set a channel account as primary for its channel type.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns true if successful
   */
  async setPrimary(id: string, tenantId: string): Promise<boolean> {
    const result = await this.channelAccountRepo.setPrimary(id, tenantId);

    if (result) {
      logger.info('Channel account set as primary', {
        channelAccountId: id,
        tenantId,
      });
    }

    return result;
  }

  /**
   * Sync templates from the provider.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns Template sync result
   */
  async syncTemplates(
    id: string,
    tenantId: string
  ): Promise<{ success: boolean; templates?: unknown[]; error?: string }> {
    return this.messagingService.getProviderTemplates(id, tenantId);
  }

  /**
   * Generate webhook URL for a channel account.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID
   * @returns Webhook URL
   */
  getWebhookUrl(id: string, tenantId: string): string {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    // For Meta, webhook is account-agnostic; for others may be per-account
    return `${baseUrl}/webhooks/meta`;
  }

  // Private helper methods

  /**
   * Convert entity to response DTO (excludes sensitive data).
   */
  private toResponse(account: ChannelAccount): ChannelAccountResponse {
    return {
      id: account.id,
      name: account.name,
      phoneNumber: account.phoneNumber,
      channelCode: account.channel?.code || '',
      channelName: account.channel?.name || '',
      providerCode: account.provider?.code || '',
      providerName: account.provider?.name || '',
      isActive: account.isActive,
      isPrimary: account.isPrimary,
      status: account.status,
      lastTestedAt: account.lastTestedAt,
      errorMessage: account.errorMessage,
      webhookUrl: account.webhookUrl,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Add non-sensitive credential info to response.
   */
  private async toResponseWithCredentialInfo(
    account: ChannelAccount
  ): Promise<ChannelAccountResponse> {
    const response = this.toResponse(account);

    try {
      const credentials = await this.credentialService.decryptCredentials(
        account.encryptedCredentials,
        account.credentialsIv
      );

      // Only include non-sensitive fields
      response.credentials = {};
      if (credentials.phoneNumberId) {
        response.credentials.phoneNumberId = credentials.phoneNumberId as string;
      }
      if (credentials.whatsappBusinessAccountId) {
        response.credentials.whatsappBusinessAccountId =
          credentials.whatsappBusinessAccountId as string;
      }
      if (credentials.appId) {
        response.credentials.appId = credentials.appId as string;
      }
    } catch (error) {
      logger.warn('Failed to decrypt credentials for response', {
        channelAccountId: account.id,
      });
    }

    return response;
  }

  /**
   * Validate credentials against provider schema.
   */
  private validateCredentials(
    credentials: ProviderCredentials,
    schema: { required?: string[]; properties?: Record<string, unknown> }
  ): void {
    // Basic validation - check required fields
    const requiredFields = schema.required || [];

    for (const field of requiredFields) {
      if (
        credentials[field] === undefined ||
        credentials[field] === null ||
        credentials[field] === ''
      ) {
        throw new Error(`Missing required credential field: ${field}`);
      }
    }
  }

  /**
   * Test connection asynchronously (fire and forget).
   */
  private testConnectionAsync(id: string, tenantId: string): void {
    this.testConnection(id, tenantId).catch((error) => {
      logger.error('Background connection test failed', {
        channelAccountId: id,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }
}
