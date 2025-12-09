import { ChannelAccountRepository } from './channel-account.repository';
import { ChannelAccount, ChannelAccountStatus } from './channel-account.entity';
import { ChannelRepository } from '../channels/channel.repository';
import { ProviderRepository } from '../providers/provider.repository';
import { CredentialService } from '../messaging/services/credential.service';
import { MessagingService } from '../messaging/services/messaging.service';
import { ProviderRegistry } from '../messaging/provider-registry';
import { ProviderCredentials } from '../messaging/interfaces/messaging-provider.interface';
import { TeamService } from '../teams/services/team.service';
/**
 * DTO for creating a channel account.
 * Credentials are provider-specific based on the provider's config_schema.
 */
export interface CreateChannelAccountDto {
    name: string;
    phoneNumber?: string;
    channelCode: string;
    providerCode?: string;
    credentials: ProviderCredentials;
    isActive?: boolean;
    isPrimary?: boolean;
    teamIds?: string[];
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
 * Account info returned from provider credential verification.
 */
export interface AccountInfo {
    businessName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    messagingLimitTier?: string;
}
/**
 * Response DTO for channel accounts (excludes sensitive data).
 */
export interface ChannelAccountResponse {
    id: string;
    name: string;
    phoneNumber: string | null;
    phoneNumberId: string | null;
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
    credentials?: {
        phoneNumberId?: string;
        whatsappBusinessAccountId?: string;
        appId?: string;
    };
    accountInfo?: AccountInfo;
}
/**
 * Service for managing channel accounts.
 *
 * Handles CRUD operations with credential encryption/decryption.
 */
export declare class ChannelAccountService {
    private channelAccountRepo;
    private channelRepo;
    private providerRepo;
    private credentialService;
    private messagingService;
    private providerRegistry;
    private teamService;
    constructor(channelAccountRepo: ChannelAccountRepository, channelRepo: ChannelRepository, providerRepo: ProviderRepository, credentialService: CredentialService, messagingService: MessagingService, providerRegistry: ProviderRegistry, teamService: TeamService);
    /**
     * Get all channel accounts for a tenant.
     *
     * @param tenantId - Tenant ID
     * @param channelCode - Optional channel filter
     * @returns List of channel accounts (without sensitive data)
     */
    getByTenant(tenantId: string, channelCode?: string): Promise<ChannelAccountResponse[]>;
    /**
     * Get a channel account by ID.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Channel account or null
     */
    getById(id: string, tenantId: string): Promise<ChannelAccountResponse | null>;
    /**
     * Get a channel account with decrypted credentials (for internal use).
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Channel account with credentials or null
     */
    getWithCredentials(id: string, tenantId: string): Promise<{
        account: ChannelAccount;
        credentials: ProviderCredentials;
    } | null>;
    /**
     * Create a new channel account.
     *
     * Performs synchronous credential validation before saving.
     * Extracts phoneNumberId from credentials for webhook routing.
     *
     * @param tenantId - Tenant ID
     * @param dto - Creation data
     * @returns Created channel account with verified account info
     * @throws Error if credentials are invalid
     */
    create(tenantId: string, dto: CreateChannelAccountDto): Promise<ChannelAccountResponse>;
    /**
     * Update a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @param dto - Update data
     * @returns Updated channel account
     */
    update(id: string, tenantId: string, dto: UpdateChannelAccountDto): Promise<ChannelAccountResponse | null>;
    /**
     * Delete a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns true if deleted
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Test connection to the provider.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Test result
     */
    testConnection(id: string, tenantId: string): Promise<{
        success: boolean;
        error?: string;
        accountInfo?: Record<string, unknown>;
    }>;
    /**
     * Set a channel account as primary for its channel type.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns true if successful
     */
    setPrimary(id: string, tenantId: string): Promise<boolean>;
    /**
     * Sync templates from the provider.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Template sync result
     */
    syncTemplates(id: string, tenantId: string): Promise<{
        success: boolean;
        templates?: unknown[];
        error?: string;
    }>;
    /**
     * Generate webhook URL for a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID
     * @returns Webhook URL
     */
    getWebhookUrl(id: string, tenantId: string): string;
    /**
     * Generate webhook configuration for a channel account.
     *
     * Returns the webhook URL and verify token needed for Meta webhook setup.
     * If no verify token exists, generates and stores a secure random token.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Webhook configuration with URL and verify token
     * @throws Error if channel account not found
     */
    generateWebhookConfig(id: string, tenantId: string): Promise<{
        webhookUrl: string;
        verifyToken: string;
    }>;
    /**
     * Create and store a new verify token for a channel account.
     */
    private createAndStoreVerifyToken;
    /**
     * Convert entity to response DTO (excludes sensitive data).
     */
    private toResponse;
    /**
     * Add non-sensitive credential info to response.
     */
    private toResponseWithCredentialInfo;
    /**
     * Validate credentials against provider schema.
     */
    private validateCredentials;
    /**
     * Test connection asynchronously (fire and forget).
     */
    private testConnectionAsync;
}
