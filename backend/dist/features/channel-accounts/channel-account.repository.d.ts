import { ChannelAccount, ChannelAccountStatus } from './channel-account.entity';
/**
 * Query options for channel accounts.
 */
export interface ChannelAccountQueryOptions {
    channelCode?: string;
    isActive?: boolean;
}
export declare class ChannelAccountRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     * This prevents errors when the DI container instantiates this class before
     * the database connection is established.
     */
    private get repository();
    /**
     * Find all channel accounts for a tenant.
     */
    findByTenant(tenantId: string, options?: ChannelAccountQueryOptions): Promise<ChannelAccount[]>;
    /**
     * Find a channel account by ID.
     */
    findById(id: string): Promise<ChannelAccount | null>;
    /**
     * Find a channel account by ID for a specific tenant.
     */
    findByIdAndTenant(id: string, tenantId: string): Promise<ChannelAccount | null>;
    /**
     * Find primary channel account for a tenant and channel.
     */
    findPrimaryByTenantAndChannel(tenantId: string, channelCode: string): Promise<ChannelAccount | null>;
    /**
     * Create a new channel account.
     */
    create(data: Partial<ChannelAccount>): Promise<ChannelAccount>;
    /**
     * Update a channel account.
     */
    update(id: string, tenantId: string, data: Partial<ChannelAccount>): Promise<ChannelAccount | null>;
    /**
     * Delete a channel account.
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Update connection status.
     */
    updateStatus(id: string, status: ChannelAccountStatus, errorMessage?: string): Promise<void>;
    /**
     * Set a channel account as primary (and unset others for same channel).
     */
    setPrimary(id: string, tenantId: string): Promise<boolean>;
    /**
     * Count channel accounts for a tenant.
     */
    countByTenant(tenantId: string): Promise<number>;
    /**
     * Find an active channel account by its provider phone number ID.
     *
     * This is the primary lookup method for routing inbound webhook events.
     * Only returns active accounts to prevent message delivery to disabled accounts.
     *
     * @param phoneNumberId - The provider's phone number ID (e.g., Meta's phone_number_id)
     * @returns The active channel account or null if not found
     */
    findByPhoneNumberId(phoneNumberId: string): Promise<ChannelAccount | null>;
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
    updateWebhookConfig(id: string, tenantId: string, encryptedSecret: string, secretIv: string): Promise<void>;
    /**
     * Find all active channel accounts.
     *
     * Used for batch operations like template status webhook processing
     * where we need to check credentials across all accounts.
     *
     * @returns All active channel accounts with relations
     */
    findAllActive(): Promise<ChannelAccount[]>;
    /**
     * Find all channel accounts that have webhook configuration.
     *
     * Used for webhook verification to check stored verify tokens.
     * Only returns accounts with encrypted webhook secrets.
     *
     * @returns Channel accounts with webhook config
     */
    findAllWithWebhookConfig(): Promise<ChannelAccount[]>;
}
