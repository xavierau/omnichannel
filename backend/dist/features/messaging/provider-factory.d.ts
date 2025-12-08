import { IMessagingProvider, ProviderCredentials } from './interfaces';
import { ProviderRegistry } from './provider-registry';
import { CredentialService } from './services/credential.service';
import { ChannelAccountRepository } from '../channel-accounts/channel-account.repository';
import { ProviderRepository } from '../providers/provider.repository';
/**
 * Custom exceptions for provider operations.
 */
export declare class ProviderNotConfiguredException extends Error {
    constructor(message: string);
}
export declare class ProviderNotFoundException extends Error {
    constructor(message: string);
}
export declare class ProviderNotImplementedException extends Error {
    constructor(message: string);
}
/**
 * Factory for creating and initializing messaging providers.
 * Implements Factory Pattern with credential decryption.
 */
export declare class ProviderFactory {
    private registry;
    private channelAccountRepo;
    private providerRepo;
    private credentialService;
    constructor(registry: ProviderRegistry, channelAccountRepo: ChannelAccountRepository, providerRepo: ProviderRepository, credentialService: CredentialService);
    /**
     * Create and initialize a provider for a specific channel account.
     *
     * @param channelAccountId - Channel account UUID
     * @returns Initialized provider instance ready to send messages
     */
    createProviderForChannelAccount(channelAccountId: string): Promise<IMessagingProvider>;
    /**
     * Create and initialize a provider for a tenant's channel (uses primary account).
     *
     * @param tenantId - Tenant UUID
     * @param channelCode - Channel code (e.g., 'whatsapp')
     * @returns Initialized provider instance
     */
    createProviderForTenantChannel(tenantId: string, channelCode: string): Promise<IMessagingProvider>;
    /**
     * Create provider for webhook handling (no initialization needed).
     * Used for parsing webhook payloads and validating signatures.
     *
     * @param providerCode - Provider code (e.g., 'meta_cloud_api')
     * @returns Uninitialized provider instance
     */
    createProviderForWebhook(providerCode: string): IMessagingProvider;
    /**
     * Create and initialize a provider with explicit credentials.
     * Used for testing credentials before saving.
     *
     * @param providerCode - Provider code
     * @param credentials - Provider credentials
     * @returns Initialized provider instance
     */
    createProviderWithCredentials(providerCode: string, credentials: ProviderCredentials): Promise<IMessagingProvider>;
}
