import { singleton, inject } from 'tsyringe';
import { IMessagingProvider, ProviderCredentials } from './interfaces';
import { ProviderRegistry } from './provider-registry';
import { CredentialService } from './services/credential.service';
import { ChannelAccountRepository } from '../channel-accounts/channel-account.repository';
import { ProviderRepository } from '../providers/provider.repository';
import { logger } from '../../config/logger.config';

/**
 * Custom exceptions for provider operations.
 */
export class ProviderNotConfiguredException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderNotConfiguredException';
  }
}

export class ProviderNotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderNotFoundException';
  }
}

export class ProviderNotImplementedException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderNotImplementedException';
  }
}

/**
 * Factory for creating and initializing messaging providers.
 * Implements Factory Pattern with credential decryption.
 */
@singleton()
export class ProviderFactory {
  constructor(
    @inject(ProviderRegistry) private registry: ProviderRegistry,
    @inject(ChannelAccountRepository) private channelAccountRepo: ChannelAccountRepository,
    @inject(ProviderRepository) private providerRepo: ProviderRepository,
    @inject(CredentialService) private credentialService: CredentialService
  ) {}

  /**
   * Create and initialize a provider for a specific channel account.
   *
   * @param channelAccountId - Channel account UUID
   * @returns Initialized provider instance ready to send messages
   */
  async createProviderForChannelAccount(
    channelAccountId: string
  ): Promise<IMessagingProvider> {
    // 1. Load channel account
    const channelAccount = await this.channelAccountRepo.findById(channelAccountId);

    if (!channelAccount) {
      throw new ProviderNotConfiguredException(
        `Channel account '${channelAccountId}' not found`
      );
    }

    if (!channelAccount.isActive) {
      throw new ProviderNotConfiguredException(
        `Channel account '${channelAccount.name}' is not active`
      );
    }

    // 2. Load provider definition
    const provider = await this.providerRepo.findById(channelAccount.providerId);

    if (!provider) {
      throw new ProviderNotFoundException(
        `Provider '${channelAccount.providerId}' not found`
      );
    }

    // 3. Get provider implementation
    if (!this.registry.has(provider.code)) {
      throw new ProviderNotImplementedException(
        `No implementation found for provider '${provider.code}'`
      );
    }

    // 4. Decrypt credentials
    const credentials = await this.credentialService.decryptCredentials(
      channelAccount.encryptedCredentials,
      channelAccount.credentialsIv
    );

    // 5. Create and initialize provider instance
    const providerInstance = this.registry.createInstance(provider.code);
    await providerInstance.initialize(credentials);

    logger.debug('Provider initialized for channel account', {
      channelAccountId,
      channelAccountName: channelAccount.name,
      providerCode: provider.code,
    });

    return providerInstance;
  }

  /**
   * Create and initialize a provider for a tenant's channel (uses primary account).
   *
   * @param tenantId - Tenant UUID
   * @param channelCode - Channel code (e.g., 'whatsapp')
   * @returns Initialized provider instance
   */
  async createProviderForTenantChannel(
    tenantId: string,
    channelCode: string
  ): Promise<IMessagingProvider> {
    // Find primary channel account for this tenant and channel
    const channelAccount = await this.channelAccountRepo.findPrimaryByTenantAndChannel(
      tenantId,
      channelCode
    );

    if (!channelAccount) {
      throw new ProviderNotConfiguredException(
        `No primary channel account configured for tenant on channel '${channelCode}'`
      );
    }

    return this.createProviderForChannelAccount(channelAccount.id);
  }

  /**
   * Create provider for webhook handling (no initialization needed).
   * Used for parsing webhook payloads and validating signatures.
   *
   * @param providerCode - Provider code (e.g., 'meta_cloud_api')
   * @returns Uninitialized provider instance
   */
  createProviderForWebhook(providerCode: string): IMessagingProvider {
    if (!this.registry.has(providerCode)) {
      throw new ProviderNotImplementedException(
        `No implementation found for provider '${providerCode}'`
      );
    }

    return this.registry.createInstance(providerCode);
  }

  /**
   * Create and initialize a provider with explicit credentials.
   * Used for testing credentials before saving.
   *
   * @param providerCode - Provider code
   * @param credentials - Provider credentials
   * @returns Initialized provider instance
   */
  async createProviderWithCredentials(
    providerCode: string,
    credentials: ProviderCredentials
  ): Promise<IMessagingProvider> {
    if (!this.registry.has(providerCode)) {
      throw new ProviderNotImplementedException(
        `No implementation found for provider '${providerCode}'`
      );
    }

    const providerInstance = this.registry.createInstance(providerCode);
    await providerInstance.initialize(credentials);

    return providerInstance;
  }
}
